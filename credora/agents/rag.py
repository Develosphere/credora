"""RAG Agent for retrieving business data from FAISS vector database.

This agent uses LangChain and FAISS to retrieve relevant business data
from embedded mock data (products, orders, campaigns, etc.).

Requirements: 6.6 - RAG-based data retrieval
"""

import json
import os
from pathlib import Path
from typing import List, Dict, Any, Optional

from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from agents import Agent

from credora.agents.base import get_default_model


# Path to FAISS index
FAISS_INDEX_PATH = "credora/data/faiss_index"
MOCK_DATA_PATH = "mock_data"

# Embedding model configuration
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"  # Fast, lightweight, and effective


def get_embeddings():
    """Get the embedding model instance.
    
    Uses HuggingFace sentence-transformers for local, free embeddings.
    Model: all-MiniLM-L6-v2 (384 dimensions, fast, good quality)
    
    Returns:
        HuggingFaceEmbeddings instance
    """
    return HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL_NAME,
        model_kwargs={'device': 'cpu'},  # Use CPU (change to 'cuda' if GPU available)
        encode_kwargs={'normalize_embeddings': True}  # Normalize for better similarity
    )


def load_mock_data() -> List[Document]:
    """Load all mock data files and convert to LangChain Documents.
    
    Returns:
        List of Document objects with metadata
    """
    documents = []
    mock_data_dir = Path(MOCK_DATA_PATH)
    
    if not mock_data_dir.exists():
        print(f"Warning: Mock data directory not found: {MOCK_DATA_PATH}")
        return documents
    
    # Load all JSON files from mock_data directory
    for json_file in mock_data_dir.rglob("*.json"):
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Determine data type from path
            platform = json_file.parent.name  # shopify, google, meta
            data_type = json_file.stem  # products, orders, campaigns, etc.
            
            # Convert JSON to text documents
            if isinstance(data, dict):
                # Handle different data structures
                for key, items in data.items():
                    if isinstance(items, list):
                        for item in items:
                            doc_text = json.dumps(item, indent=2)
                            metadata = {
                                "platform": platform,
                                "data_type": data_type,
                                "source": str(json_file),
                                "item_id": item.get("id", "unknown"),
                            }
                            documents.append(Document(
                                page_content=doc_text,
                                metadata=metadata
                            ))
            elif isinstance(data, list):
                for item in data:
                    doc_text = json.dumps(item, indent=2)
                    metadata = {
                        "platform": platform,
                        "data_type": data_type,
                        "source": str(json_file),
                        "item_id": item.get("id", "unknown"),
                    }
                    documents.append(Document(
                        page_content=doc_text,
                        metadata=metadata
                    ))
        
        except Exception as e:
            print(f"Error loading {json_file}: {e}")
    
    print(f"Loaded {len(documents)} documents from mock data")
    return documents


def create_faiss_index(force_rebuild: bool = False) -> FAISS:
    """Create or load FAISS vector store from mock data.
    
    Args:
        force_rebuild: If True, rebuild index even if it exists
        
    Returns:
        FAISS vector store instance
    """
    index_path = Path(FAISS_INDEX_PATH)
    
    # Check if index already exists
    if index_path.exists() and not force_rebuild:
        print(f"Loading existing FAISS index from {FAISS_INDEX_PATH}")
        embeddings = get_embeddings()
        return FAISS.load_local(
            str(index_path),
            embeddings,
            allow_dangerous_deserialization=True
        )
    
    print("Building new FAISS index from mock data...")
    print(f"Using local embedding model: {EMBEDDING_MODEL_NAME}")
    
    # Load documents
    documents = load_mock_data()
    
    if not documents:
        raise ValueError("No documents found to index")
    
    # Split documents into chunks for better retrieval
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
    )
    split_docs = text_splitter.split_documents(documents)
    print(f"Split into {len(split_docs)} chunks")
    
    # Create embeddings (local, no API calls)
    print("Creating embeddings (this may take a minute on first run)...")
    embeddings = get_embeddings()
    
    # Create FAISS index
    vectorstore = FAISS.from_documents(split_docs, embeddings)
    
    # Save index
    index_path.parent.mkdir(parents=True, exist_ok=True)
    vectorstore.save_local(str(index_path))
    print(f"FAISS index saved to {FAISS_INDEX_PATH}")
    
    return vectorstore


def retrieve_business_data(
    query: str,
    k: int = 5,
    platform_filter: Optional[str] = None,
    data_type_filter: Optional[str] = None
) -> str:
    """Retrieve relevant business data from FAISS vector store.
    
    This is a tool function that can be called by agents.
    
    Args:
        query: Natural language query about business data
        k: Number of results to retrieve
        platform_filter: Optional filter by platform (shopify, google, meta)
        data_type_filter: Optional filter by data type (products, orders, campaigns)
        
    Returns:
        Formatted string with retrieved data
    """
    try:
        # Load FAISS index
        vectorstore = create_faiss_index(force_rebuild=False)
        
        # Build filter dict
        filter_dict = {}
        if platform_filter:
            filter_dict["platform"] = platform_filter
        if data_type_filter:
            filter_dict["data_type"] = data_type_filter
        
        # Perform similarity search
        if filter_dict:
            docs = vectorstore.similarity_search(
                query,
                k=k,
                filter=filter_dict
            )
        else:
            docs = vectorstore.similarity_search(query, k=k)
        
        if not docs:
            return "No relevant data found for your query."
        
        # Format results
        results = []
        for i, doc in enumerate(docs, 1):
            platform = doc.metadata.get("platform", "unknown")
            data_type = doc.metadata.get("data_type", "unknown")
            results.append(
                f"Result {i} [{platform}/{data_type}]:\n{doc.page_content}\n"
            )
        
        return "\n".join(results)
    
    except Exception as e:
        return f"Error retrieving data: {str(e)}"


def search_products(query: str, k: int = 3) -> str:
    """Search for products in the catalog.
    
    Args:
        query: Product search query (name, SKU, category, etc.)
        k: Number of results to return
        
    Returns:
        Formatted product information
    """
    return retrieve_business_data(
        query=query,
        k=k,
        platform_filter="shopify",
        data_type_filter="products"
    )


def search_orders(query: str, k: int = 5) -> str:
    """Search for order information.
    
    Args:
        query: Order search query (customer, date, product, etc.)
        k: Number of results to return
        
    Returns:
        Formatted order information
    """
    return retrieve_business_data(
        query=query,
        k=k,
        platform_filter="shopify",
        data_type_filter="orders"
    )


def search_campaigns(query: str, platform: Optional[str] = None, k: int = 3) -> str:
    """Search for advertising campaign data.
    
    Args:
        query: Campaign search query (name, performance, etc.)
        platform: Optional platform filter ('google' or 'meta')
        k: Number of results to return
        
    Returns:
        Formatted campaign information
    """
    return retrieve_business_data(
        query=query,
        k=k,
        platform_filter=platform,
        data_type_filter="campaigns"
    )


def get_business_context(query: str, k: int = 10) -> str:
    """Get comprehensive business context for a query.
    
    Retrieves relevant data across all platforms and data types.
    
    Args:
        query: Business question or context query
        k: Number of results to retrieve
        
    Returns:
        Formatted business context
    """
    return retrieve_business_data(query=query, k=k)


# Agent instructions
RAG_AGENT_INSTRUCTIONS = """You are the RAG Data Retrieval Agent for Credora.

Your role is to retrieve relevant business data from the FAISS vector database
containing products, orders, campaigns, and other business information.

## Available Tools

1. **retrieve_business_data**: General-purpose retrieval across all data
   - Use for broad queries or when data type is unclear
   
2. **search_products**: Search product catalog
   - Use for product-related queries (SKU, name, inventory, pricing)
   
3. **search_orders**: Search order history
   - Use for sales, revenue, customer order queries
   
4. **search_campaigns**: Search advertising campaigns
   - Use for ad performance, ROAS, campaign metrics
   
5. **get_business_context**: Get comprehensive business context
   - Use for complex queries requiring multiple data types

## Response Guidelines

- Always cite the data source (platform/data_type)
- Format numbers clearly (currency, percentages, etc.)
- Summarize key findings before providing details
- If no data found, suggest alternative queries
- Be specific about data limitations (mock data, date ranges)

## Example Queries

"Show me our best-selling products" → use search_products
"What were our sales last week?" → use search_orders
"How are our Google Ads performing?" → use search_campaigns with platform='google'
"Give me an overview of the business" → use get_business_context

Remember: You are retrieving from mock data for demonstration purposes.
Always be clear about this when presenting results.
"""


def create_rag_agent() -> Agent:
    """Create and configure the RAG Data Retrieval Agent.
    
    Returns:
        Configured Agent instance for RAG-based data retrieval
    """
    return Agent(
        name="RAG Data Agent",
        instructions=RAG_AGENT_INSTRUCTIONS,
        tools=[
            retrieve_business_data,
            search_products,
            search_orders,
            search_campaigns,
            get_business_context,
        ],
        model=get_default_model(),
    )


def get_rag_agent() -> Agent:
    """Get a pre-configured RAG Agent instance.
    
    Returns:
        Configured Agent instance
    """
    return create_rag_agent()


__all__ = [
    "create_rag_agent",
    "get_rag_agent",
    "create_faiss_index",
    "retrieve_business_data",
    "search_products",
    "search_orders",
    "search_campaigns",
    "get_business_context",
]
