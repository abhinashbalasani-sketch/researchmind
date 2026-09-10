from app.agents.source_discovery import credibility_score


def test_academic_ranks_higher_than_random_web():
    paper = {
        "source_type": "academic",
        "cited_by": 120,
        "year": 2024,
        "url": "https://arxiv.org/abs/1234",
        "title": "A substantial academic title about agentic systems",
        "snippet": "We evaluate retrieval agents on education datasets.",
    }
    blog = {
        "source_type": "web",
        "url": "https://random-blog.example/post",
        "title": "Hello",
        "snippet": "short",
    }
    assert credibility_score(paper) > credibility_score(blog)
