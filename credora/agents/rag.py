"""RAG Agent for retrieving business data from FAISS vector database.

This module provides backward compatibility by importing from the new
modular RAG system in credora.rag package.

DEPRECATED: This file is maintained for backward compatibility.
New code should import directly from credora.rag package.

Requirements: 6.6 - RAG-based data retrieval
"""

# Import from new modular structure
from credora.rag.data_loader import load_documents_from_json as load_mock_data
from credora.rag.index_builder import (
    rebuild_index as create_faiss_index_new,
    get_embeddings,
    DEFAULT_INDEX_PATH as FAISS_INDEX_PATH,
)
from credora.rag.retrieval_tool import (
    retrieve_business_data,
    search_products,
    search_orders,
    search_campaigns,
    get_business_context,
)
from credora.rag.rag_agent import (
    create_rag_agent,
    get_rag_agent,
    RAG_AGENT_INSTRUCTIONS,
)

# Legacy constants for backward compatibility
MOCK_DATA_PATH = "mock_data"
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"


def create_faiss_index(force_rebuild: bool = False):
    """Create or load FAISS vector store from mock data.

    DEPRECATED: Use credora.rag.index_builder.rebuild_index() instead.

    Args:
        force_rebuild: If True, rebuild index even if it exists

    Returns:
        FAISS vector store instance
    """
    from credora.rag.vector_store import get_vector_store
    from credora.rag.index_builder import rebuild_index, index_exists

    if force_rebuild or not index_exists():
        rebuild_index(data_path=MOCK_DATA_PATH, force=force_rebuild)

    return get_vector_store().get_vectorstore()


# Export all public functions for backward compatibility
__all__ = [
    "create_rag_agent",
    "get_rag_agent",
    "create_faiss_index",
    "retrieve_business_data",
    "search_products",
    "search_orders",
    "search_campaigns",
    "get_business_context",
    "load_mock_data",
    "get_embeddings",
    "RAG_AGENT_INSTRUCTIONS",
    "FAISS_INDEX_PATH",
    "MOCK_DATA_PATH",
    "EMBEDDING_MODEL_NAME",
]
