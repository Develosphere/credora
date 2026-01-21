"""Agent definitions for the Credora CFO system."""

from credora.agents.base import (
    create_openai_client,
    create_model,
    get_default_model,
)
from credora.agents.onboarding import (
    create_onboarding_agent,
    get_onboarding_agent,
    ONBOARDING_INSTRUCTIONS,
)
from credora.agents.data_fetcher import (
    create_data_fetcher_agent,
    get_data_fetcher_agent,
    DATA_FETCHER_INSTRUCTIONS,
)
from credora.agents.analytics import (
    create_analytics_agent,
    get_analytics_agent,
    ANALYTICS_AGENT_INSTRUCTIONS,
)
# Competitor Analysis Agent System - Import directly from credora.agents.competitor
# to avoid circular imports. These are not exported via __init__.py
# Example: from credora.agents.competitor import CompetitorAnalysisAgentSystem
from credora.agents.insight import (
    create_insight_agent,
    get_insight_agent,
    INSIGHT_AGENT_INSTRUCTIONS,
)
from credora.agents.rag import (
    create_rag_agent,
    get_rag_agent,
    create_faiss_index,
    retrieve_business_data,
    search_products,
    search_orders,
    search_campaigns,
    get_business_context,
)
from credora.agents.cfo import (
    create_cfo_agent,
    get_cfo_agent,
    CFO_AGENT_INSTRUCTIONS,
    QUERY_INTENTS,
    classify_query_intent,
)

__all__ = [
    # Base agent utilities
    "create_openai_client",
    "create_model",
    "get_default_model",
    # Onboarding agent
    "create_onboarding_agent",
    "get_onboarding_agent",
    "ONBOARDING_INSTRUCTIONS",
    # Data Fetcher agent
    "create_data_fetcher_agent",
    "get_data_fetcher_agent",
    "DATA_FETCHER_INSTRUCTIONS",
    # Analytics agent
    "create_analytics_agent",
    "get_analytics_agent",
    "ANALYTICS_AGENT_INSTRUCTIONS",
    # Competitor Agent System - Import directly from credora.agents.competitor
    # to avoid circular imports. See module docstring for details.
    # Insight agent
    "create_insight_agent",
    "get_insight_agent",
    "INSIGHT_AGENT_INSTRUCTIONS",
    # RAG agent
    "create_rag_agent",
    "get_rag_agent",
    "create_faiss_index",
    "retrieve_business_data",
    "search_products",
    "search_orders",
    "search_campaigns",
    "get_business_context",
    # CFO orchestrator agent
    "create_cfo_agent",
    "get_cfo_agent",
    "CFO_AGENT_INSTRUCTIONS",
    "QUERY_INTENTS",
    "classify_query_intent",
]
