from langgraph.graph import END, START, StateGraph

from app.graph.nodes import (
    classify,
    deliberate,
    generate,
    retrieve,
    route_after_classify,
    route_after_context,
    web_search,
)
from app.graph.state import NexusState

NODE_LABELS = {
    "classify": "Understanding your question",
    "retrieve": "Searching your documents",
    "web_search": "Searching the web",
    "deliberate": "Thinking it through",
    "generate": "Writing the answer",
}


def build_graph():
    graph = StateGraph(NexusState)
    graph.add_node("classify", classify)
    graph.add_node("retrieve", retrieve)
    graph.add_node("web_search", web_search)
    graph.add_node("deliberate", deliberate)
    graph.add_node("generate", generate)
    graph.add_edge(START, "classify")
    graph.add_conditional_edges(
        "classify",
        route_after_classify,
        {"retrieve": "retrieve", "web_search": "web_search", "deliberate": "deliberate", "generate": "generate"},
    )
    for node in ("retrieve", "web_search"):
        graph.add_conditional_edges(node, route_after_context, {"deliberate": "deliberate", "generate": "generate"})
    graph.add_edge("deliberate", "generate")
    graph.add_edge("generate", END)
    return graph.compile()


nexus_graph = build_graph()
