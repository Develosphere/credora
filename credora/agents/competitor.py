"""
Competitor Analysis Agent System with MCP Server Integration
=============================================================

This module implements an orchestrated multi-agent system for competitor analysis
using the OpenAI Agents SDK with handoffs pattern.

Architecture:
    - Triage Agent (Coordinator): Routes requests to specialized agents
    - Competitor Search Agent: Finds competitors using web search
    - Website Scraper Agent: Scrapes competitor websites for analysis
    - Strategy Analyzer Agent: Analyzes competitor strategies
    - Report Generator Agent: Generates comprehensive reports

All agents use the Competitor-Spy MCP Server tools for actual operations.

Requirements:
    - OpenAI Agents SDK
    - MCP Server running (competitor_server.py)
"""

import asyncio
from typing import Callable
from agents import Agent, handoff, Runner
from agents.mcp import MCPServerStdio


def _get_model():
    """Lazy import of get_default_model to avoid circular imports."""
    from credora.agents.base import get_default_model
    return get_default_model()


# =============================================================================
# MCP Server Configuration
# =============================================================================

def get_mcp_server() -> MCPServerStdio:
    """Get the Competitor-Spy MCP server configuration.
    
    Returns:
        MCPServerStdio configured for the competitor analysis server.
    """
    return MCPServerStdio(
        name="Competitor-Spy",
        params={
            "command": "python",
            "args": ["credora/mcp_servers/fastmcp/competitor_server.py"],
        }
    )


# =============================================================================
# Agent Instructions (Well-Defined Prompts)
# =============================================================================

TRIAGE_AGENT_INSTRUCTIONS = """You are the Competitor Analysis Triage Agent - the intelligent coordinator for comprehensive competitor research.

## Your Role
You are the entry point and orchestrator for all competitor analysis requests. You understand user intent and delegate tasks to the appropriate specialized agents.

## Core Responsibilities
1. **Understand User Intent**: Parse what the user wants to analyze (business type, city, specific competitors)
2. **Delegate to Specialists**: Hand off to the right agent based on the task
3. **Coordinate Workflow**: Ensure agents work in the correct sequence
4. **Never Perform Analysis Yourself**: You only coordinate, never execute

## Available Specialist Agents

1. **Competitor Search Agent** - For finding competitors in a market
   - Use when: User wants to discover competitors, find URLs, search the market
   - Example: "Find my competitors", "Who sells perfume in Karachi?"

2. **Website Scraper Agent** - For extracting content from websites
   - Use when: User has specific URLs to analyze
   - Example: "Scrape this website", "What's on elyscents.pk?"

3. **Strategy Analyzer Agent** - For analyzing competitor strategies
   - Use when: User wants to understand pricing, offers, tactics
   - Example: "What's their pricing strategy?", "How do they get orders?"

4. **Report Generator Agent** - For creating comprehensive reports
   - Use when: User wants a full analysis with report output
   - Example: "Analyze all my competitors and give me a report"

## Workflow Pattern
For a complete competitor analysis, the typical flow is:
1. Search for competitors → Competitor Search Agent
2. Scrape each website → Website Scraper Agent
3. Analyze strategies → Strategy Analyzer Agent
4. Generate report → Report Generator Agent

## Important Rules
- ALWAYS hand off to a specialist agent - never answer analysis questions yourself
- Pass ALL context (business type, city, URLs) to the specialist
- If unsure which agent to use, ask the user for clarification
- After an agent completes, check if additional steps are needed

## Response Format
When handing off, briefly explain what will happen next:
"I'll hand this to the [Agent Name] to [specific task]..."
"""

SEARCH_AGENT_INSTRUCTIONS = """You are the Competitor Search Agent - a specialist in discovering competitors in any market.

## Your Role
You find and identify competitors for a given business type and location using web search capabilities.

## Your Tools
You have access to the `search_competitors` tool from the MCP server which uses DuckDuckGo to find competitor URLs.

## How to Search
1. Take the business type and city from the request
2. Construct effective search queries like:
   - "{business_type} shops {city} Pakistan"
   - "best {business_type} brands online Pakistan"
3. Use the search_competitors tool with appropriate queries
4. Return a clean list of competitor URLs and names

## Output Format
Provide results in a structured format:
```
## Competitors Found for [Business Type] in [City]

1. **[Competitor Name]**
   - URL: [website URL]
   - Description: [brief description from search]

2. **[Competitor Name]**
   ...
```

## After Completion
After finding competitors, hand off to the Website Scraper Agent if the user wants detailed analysis, or return results to the Triage Agent.

## Important
- Focus ONLY on finding competitors
- Don't try to analyze websites - that's for other agents
- Prioritize local/Pakistani businesses when possible
- Filter out marketplaces (Daraz, Amazon) unless specifically requested
"""

SCRAPER_AGENT_INSTRUCTIONS = """You are the Website Scraper Agent - a specialist in extracting content from competitor websites.

## Your Role
You scrape and extract meaningful content from competitor websites using browser automation.

## Your Tools
You have access to the `scrape_website` tool from the MCP server which:
- Launches a headless browser
- Navigates to the URL
- Extracts clean text content
- Returns structured data

## How to Scrape
1. Take the URL(s) from the request
2. Use the scrape_website tool for each URL
3. Extract and organize the content
4. Identify key elements: prices, products, offers, contact info

## What to Look For
When scraping, identify:
- **Prices**: Look for Rs., PKR, price tags
- **Products**: Categories, bestsellers, product types
- **Offers**: Discounts, sales, bundle deals
- **Shipping**: Delivery options, COD, free shipping thresholds
- **Contact**: WhatsApp, phone numbers, addresses

## Output Format
```
## Scraped Content: [Website Name]

**URL**: [full URL]
**Title**: [page title]

### Key Findings
- Prices Found: [Yes/No] - Examples: Rs. X, Rs. Y
- Discounts: [Yes/No] - Details: [if any]
- Delivery: [Yes/No] - Options: [details]
- Contact: [WhatsApp/Phone/Email if found]

### Content Preview
[First 500 characters of relevant content]
```

## After Completion
Hand off to the Strategy Analyzer Agent for deep analysis, or return to Triage Agent.

## Important
- Scrape ONE website at a time for accuracy
- Handle errors gracefully (timeout, blocked, etc.)
- Don't analyze - just extract and organize data
"""

ANALYZER_AGENT_INSTRUCTIONS = """You are the Strategy Analyzer Agent - an expert in decoding competitor business strategies.

## Your Role
You analyze scraped competitor data to identify their business strategies, pricing tactics, and conversion techniques.

## Your Expertise Areas

### 1. Pricing Strategy
- Price positioning (budget, mid-range, premium)
- Psychological pricing (Rs. 2,999 vs Rs. 3,000)
- Price anchoring and comparisons
- Bundle pricing and upsells

### 2. Conversion Tactics
- Urgency triggers (limited time, low stock)
- Trust signals (reviews, badges, guarantees)
- Social proof (testimonials, customer count)
- Call-to-action effectiveness

### 3. Customer Experience
- Shipping and delivery options
- Return policies
- Payment methods (COD importance in Pakistan)
- WhatsApp/support availability

### 4. Marketing Approach
- Promotional strategies
- Category focus
- Target audience signals
- Brand positioning

## Analysis Framework
For each competitor, evaluate:
1. **What's their "Secret Sauce"?** - Why do customers buy from them?
2. **How do they build trust?** - Reviews, guarantees, social proof
3. **What's their pricing game?** - Entry points, premium tiers, bundles
4. **How do they convert?** - Urgency, offers, CTAs
5. **Gaps & Opportunities** - What are they missing?

## Output Format
```
## Strategy Analysis: [Competitor Name]

### The Secret Sauce
[What makes them successful - 2-3 sentences]

### Pricing Strategy
- Position: [Budget/Mid/Premium]
- Entry Point: Rs. [X]
- Premium Range: Rs. [Y-Z]
- Tactics: [Bundle, Anchor, Psychological]

### Conversion Tactics
- Trust Signals: [List what they use]
- Urgency: [How they create it]
- Social Proof: [Reviews, testimonials, counts]

### Opportunities to Beat Them
1. [Gap or weakness you identified]
2. [Something you can do better]
3. [Untapped opportunity]
```

## After Completion
Hand off to the Report Generator Agent for final report, or return insights to Triage.
"""

REPORTER_AGENT_INSTRUCTIONS = """You are the Report Generator Agent - a specialist in creating comprehensive competitor analysis reports.

## Your Role
You synthesize all competitor research into actionable, professional reports that help businesses beat their competition.

## Your Tools
You have access to the `analyze_competitors` tool from the MCP server which:
- Launches a visible browser
- Searches for competitors
- Visits each website
- Analyzes their strategies
- Generates a .txt report file

## Report Sections

### 1. Executive Summary
- Number of competitors analyzed
- Key market insights
- Top opportunity identified

### 2. Competitor Overview Table
| Competitor | Prices | Discounts | Delivery | Reviews | Score |
|------------|--------|-----------|----------|---------|-------|
| [Name]     | ✅/❌  | ✅/❌     | ✅/❌    | ✅/❌   | X/8   |

### 3. Detailed Competitor Profiles
For each competitor:
- Website and contact info
- Strategy checklist
- Content highlights
- Strengths and weaknesses

### 4. Strategic Recommendations
Actionable advice on:
- Pricing strategy
- Promotional tactics
- Delivery options
- Trust building
- WhatsApp strategy
- Unique positioning

### 5. Competitor Rankings
Ranked list by strategy score

## Report Generation Process
1. If you have pre-analyzed data, compile it into the report format
2. If starting fresh, use analyze_competitors tool with:
   - business_type: The user's industry
   - city: Target location (default: Karachi)
   - max_competitors: How many to analyze (default: 5)
3. Save report to specified output file

## Output Format
Confirm report generation:
```
## Report Generated Successfully! 📊

**File Location**: [path to report]
**Competitors Analyzed**: [X]
**Key Finding**: [Most important insight]

### Quick Stats
- Show Prices: X/X (XX%)
- Run Discounts: X/X (XX%)
- Offer Delivery: X/X (XX%)

### Top Recommendation
[Single most actionable advice]
```

## Important
- Always generate actionable insights
- Focus on Pakistan market specifics
- Highlight WhatsApp as critical channel
- Make recommendations specific and clear
"""


# =============================================================================
# Handoff Callbacks
# =============================================================================

def on_search_handoff(context: dict) -> None:
    """Called when handing off to the Search Agent."""
    print("\n🔍 [Handoff] Transferring to Competitor Search Agent...")
    print(f"   Context: {context.get('business_type', 'unknown')} in {context.get('city', 'Karachi')}")


def on_scraper_handoff(context: dict) -> None:
    """Called when handing off to the Scraper Agent."""
    print("\n🌐 [Handoff] Transferring to Website Scraper Agent...")
    urls = context.get('urls', [])
    print(f"   URLs to scrape: {len(urls) if urls else 'pending'}")


def on_analyzer_handoff(context: dict) -> None:
    """Called when handing off to the Analyzer Agent."""
    print("\n📊 [Handoff] Transferring to Strategy Analyzer Agent...")


def on_reporter_handoff(context: dict) -> None:
    """Called when handing off to the Report Generator Agent."""
    print("\n📝 [Handoff] Transferring to Report Generator Agent...")


# =============================================================================
# Agent Factory Functions
# =============================================================================

def create_search_agent(mcp_server: MCPServerStdio) -> Agent:
    """Create the Competitor Search Agent.
    
    Args:
        mcp_server: The MCP server for tool access.
        
    Returns:
        Configured Agent for competitor search.
    """
    return Agent(
        name="Competitor Search Agent",
        handoff_description="A specialist agent that searches the web to find competitors in a specific market, industry, or location. Use this when you need to discover competitor URLs and names.",
        instructions=SEARCH_AGENT_INSTRUCTIONS,
        model=_get_model(),
        mcp_servers=[mcp_server],
    )


def create_scraper_agent(mcp_server: MCPServerStdio) -> Agent:
    """Create the Website Scraper Agent.
    
    Args:
        mcp_server: The MCP server for tool access.
        
    Returns:
        Configured Agent for website scraping.
    """
    return Agent(
        name="Website Scraper Agent",
        handoff_description="A specialist agent that scrapes websites to extract content like prices, products, and contact information. Use this when you have specific URLs to analyze.",
        instructions=SCRAPER_AGENT_INSTRUCTIONS,
        model=_get_model(),
        mcp_servers=[mcp_server],
    )


def create_analyzer_agent() -> Agent:
    """Create the Strategy Analyzer Agent.
    
    Returns:
        Configured Agent for strategy analysis.
    """
    return Agent(
        name="Strategy Analyzer Agent",
        handoff_description="An expert agent that analyzes competitor data to identify their pricing strategies, conversion tactics, and business approaches. Use this when you have scraped data and need strategic insights.",
        instructions=ANALYZER_AGENT_INSTRUCTIONS,
        model=_get_model(),
    )


def create_reporter_agent(mcp_server: MCPServerStdio) -> Agent:
    """Create the Report Generator Agent.
    
    Args:
        mcp_server: The MCP server for tool access.
        
    Returns:
        Configured Agent for report generation.
    """
    return Agent(
        name="Report Generator Agent",
        handoff_description="A specialist agent that generates comprehensive competitor analysis reports with actionable recommendations. Use this for full analysis with report output.",
        instructions=REPORTER_AGENT_INSTRUCTIONS,
        model=_get_model(),
        mcp_servers=[mcp_server],
    )


def create_triage_agent(
    search_agent: Agent,
    scraper_agent: Agent,
    analyzer_agent: Agent,
    reporter_agent: Agent,
) -> Agent:
    """Create the Triage Agent (Coordinator).
    
    Args:
        search_agent: The competitor search agent.
        scraper_agent: The website scraper agent.
        analyzer_agent: The strategy analyzer agent.
        reporter_agent: The report generator agent.
        
    Returns:
        Configured Triage Agent with handoffs to all specialists.
    """
    return Agent(
        name="Competitor Analysis Triage Agent",
        handoff_description="The main coordinator agent that routes competitor analysis requests to the appropriate specialist agents.",
        instructions=TRIAGE_AGENT_INSTRUCTIONS,
        model=_get_model(),
        handoffs=[
            handoff(agent=search_agent, on_handoff=on_search_handoff),
            handoff(agent=scraper_agent, on_handoff=on_scraper_handoff),
            handoff(agent=analyzer_agent, on_handoff=on_analyzer_handoff),
            handoff(agent=reporter_agent, on_handoff=on_reporter_handoff),
        ],
    )


# =============================================================================
# Main Agent System Setup
# =============================================================================

class CompetitorAnalysisAgentSystem:
    """Orchestrated multi-agent system for competitor analysis.
    
    This class manages the complete agent system with MCP server integration
    and provides a clean interface for running competitor analysis.
    
    Example:
        async with CompetitorAnalysisAgentSystem() as system:
            result = await system.run("Analyze my perfume competitors in Karachi")
    """
    
    def __init__(self):
        """Initialize the agent system."""
        self.mcp_server = get_mcp_server()
        self.triage_agent = None
        self._initialized = False
    
    async def __aenter__(self):
        """Async context manager entry - initialize agents."""
        await self.initialize()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit - cleanup."""
        await self.cleanup()
    
    async def initialize(self):
        """Initialize all agents and MCP server connection."""
        if self._initialized:
            return
        
        # Create specialist agents
        search_agent = create_search_agent(self.mcp_server)
        scraper_agent = create_scraper_agent(self.mcp_server)
        analyzer_agent = create_analyzer_agent()
        reporter_agent = create_reporter_agent(self.mcp_server)
        
        # Create triage agent with handoffs
        self.triage_agent = create_triage_agent(
            search_agent=search_agent,
            scraper_agent=scraper_agent,
            analyzer_agent=analyzer_agent,
            reporter_agent=reporter_agent,
        )
        
        self._initialized = True
        print("✅ Competitor Analysis Agent System initialized")
    
    async def cleanup(self):
        """Cleanup resources."""
        self._initialized = False
        print("🧹 Competitor Analysis Agent System cleanup complete")
    
    async def run(self, user_request: str) -> str:
        """Run the agent system with a user request.
        
        Args:
            user_request: The user's request for competitor analysis.
            
        Returns:
            The final response from the agent system.
        """
        if not self._initialized:
            await self.initialize()
        
        print(f"\n{'='*70}")
        print("🤖 COMPETITOR ANALYSIS AGENT SYSTEM")
        print(f"{'='*70}")
        print(f"📝 User Request: {user_request}")
        print(f"{'='*70}\n")
        
        # Run the agent with the MCP server context
        async with self.mcp_server:
            result = await Runner.run(
                starting_agent=self.triage_agent,
                input=user_request,
            )
        
        return result.final_output


# =============================================================================
# Convenience Functions
# =============================================================================

def create_competitor_analysis_system() -> CompetitorAnalysisAgentSystem:
    """Create a new Competitor Analysis Agent System.
    
    Returns:
        Configured CompetitorAnalysisAgentSystem instance.
    """
    return CompetitorAnalysisAgentSystem()


async def analyze_competitors_with_agents(
    business_type: str,
    city: str = "Karachi",
    generate_report: bool = True
) -> str:
    """Run a complete competitor analysis using the agent system.
    
    Args:
        business_type: Type of business (e.g., "perfume", "candles")
        city: City to search in (default: "Karachi")
        generate_report: Whether to generate a full report (default: True)
        
    Returns:
        The analysis result or report path.
    """
    request = f"I have a {business_type} business in {city}. "
    
    if generate_report:
        request += "Please analyze my competitors and generate a comprehensive report with strategies to beat them."
    else:
        request += "Please find my competitors and analyze their strategies."
    
    async with CompetitorAnalysisAgentSystem() as system:
        result = await system.run(request)
    
    return result


# =============================================================================
# CLI Entry Point
# =============================================================================

async def main():
    """CLI entry point for testing the agent system."""
    print("\n" + "=" * 70)
    print("COMPETITOR ANALYSIS AGENT SYSTEM - TEST MODE")
    print("=" * 70)
    
    # Example: Analyze perfume competitors in Karachi
    result = await analyze_competitors_with_agents(
        business_type="perfume",
        city="Karachi",
        generate_report=True
    )
    
    print("\n" + "=" * 70)
    print("FINAL RESULT:")
    print("=" * 70)
    print(result)


if __name__ == "__main__":
    asyncio.run(main())


# =============================================================================
# Exports
# =============================================================================

# Backward-compatible wrapper for cfo.py that imports create_competitor_agent
def create_competitor_agent():
    """Backward-compatible wrapper that returns the Triage Agent.
    
    This maintains compatibility with cfo.py which imports create_competitor_agent.
    The Triage Agent serves as the main entry point for competitor analysis.
    
    Returns:
        Agent: The Triage Agent configured for competitor analysis.
    """
    mcp_server = get_mcp_server()
    search_agent = create_search_agent(mcp_server)
    scraper_agent = create_scraper_agent(mcp_server)
    analyzer_agent = create_analyzer_agent()
    reporter_agent = create_reporter_agent(mcp_server)
    
    return create_triage_agent(
        search_agent=search_agent,
        scraper_agent=scraper_agent,
        analyzer_agent=analyzer_agent,
        reporter_agent=reporter_agent,
    )


def get_competitor_agent():
    """Get a pre-configured Competitor Agent instance.
    
    Backward-compatible alias for create_competitor_agent.
    
    Returns:
        Agent: Configured competitor analysis agent.
    """
    return create_competitor_agent()


__all__ = [
    # Agent System
    "CompetitorAnalysisAgentSystem",
    "create_competitor_analysis_system",
    "analyze_competitors_with_agents",
    # Agent Factory Functions
    "create_triage_agent",
    "create_search_agent",
    "create_scraper_agent",
    "create_analyzer_agent",
    "create_reporter_agent",
    # Backward-compatible exports (for cfo.py)
    "create_competitor_agent",
    "get_competitor_agent",
    # MCP Server
    "get_mcp_server",
    # Instructions (for customization)
    "TRIAGE_AGENT_INSTRUCTIONS",
    "SEARCH_AGENT_INSTRUCTIONS",
    "SCRAPER_AGENT_INSTRUCTIONS",
    "ANALYZER_AGENT_INSTRUCTIONS",
    "REPORTER_AGENT_INSTRUCTIONS",
]

