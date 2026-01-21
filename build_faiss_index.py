"""Build FAISS vector database from mock data.

Run this script to create or rebuild the FAISS index from mock data files.
"""

import asyncio
from credora.agents.rag import create_faiss_index


def main():
    """Build the FAISS index."""
    print("=" * 60)
    print("Building FAISS Vector Database from Mock Data")
    print("=" * 60)
    print()
    
    try:
        # Build index (force rebuild)
        vectorstore = create_faiss_index(force_rebuild=True)
        
        print()
        print("=" * 60)
        print("✅ FAISS index built successfully!")
        print("=" * 60)
        print()
        print("Index location: credora/data/faiss_index")
        print()
        print("You can now use the RAG agent to query business data.")
        print()
        
    except Exception as e:
        print()
        print("=" * 60)
        print("❌ Error building FAISS index")
        print("=" * 60)
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
