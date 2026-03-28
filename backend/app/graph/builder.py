from langgraph.graph import StateGraph, END, START
from app.graph.state import NexusState
from app.graph.nodes import (
    classify_intent,
    retrieve_context,
    web_search,
    generate_response,
    route_after_classify,
)


def build_nexus_graph():
    """
    Nexus LangGraph — updated flow with web search:

        START
          │
          ▼
        classify  ──────────────────────────────────────┐
          │                                             │
          │ intent="rag"     intent="search"   intent="general"
          ▼                       ▼                     ▼
        retrieve             web_search            generate
          │                       │                     │
          └───────────────────────┴────────► generate   │
                                                  │     │
                                                 END ◄──┘
    """
    workflow = StateGraph(NexusState)

    workflow.add_node("classify", classify_intent)
    workflow.add_node("retrieve", retrieve_context)
    workflow.add_node("web_search", web_search)
    workflow.add_node("generate", generate_response)

    workflow.add_edge(START, "classify")
    workflow.add_conditional_edges(
        "classify",
        route_after_classify,
        {
            "retrieve": "retrieve",
            "web_search": "web_search",
            "generate": "generate",
        },
    )
    workflow.add_edge("retrieve", "generate")
    workflow.add_edge("web_search", "generate")
    workflow.add_edge("generate", END)

    return workflow.compile()


nexus_graph = build_nexus_graph()
