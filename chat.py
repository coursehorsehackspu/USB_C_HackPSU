# ============================================================
# CourseHorse — chat.py
# ============================================================
# Terminal chat interface for the AI Counselor Agent.
# Usage: python chat.py
# ============================================================

import sys
from counselor_agent import xCounselorAgent


def print_banner():
    print("\n" + "="*60)
    print("  🎓 DegreeFlow AI Counselor — Penn State University")
    print("="*60)
    print("  Ask me anything about courses, programs, deadlines,")
    print("  financial aid, admissions, campus life, and more.")
    print("  Type 'quit' to exit.\n")


def print_sources(sources: list):
    if not sources:
        return
    print("\n  📎 Sources:")
    seen = set()
    for s in sources:
        url = s.get("url", "")
        if url and url not in seen:
            seen.add(url)
            title = s.get("title", url)[:55]
            print(f"     • {title}")
            print(f"       {url}")


def main():
    print_banner()

    try:
        agent = xCounselorAgent()
        print("  ✅ Connected to PSU knowledge base\n")
    except Exception as e:
        print(f"  ❌ Failed to connect: {e}")
        print("  Make sure your .env file has MONGO_URI and ANTHROPIC_API_KEY")
        sys.exit(1)

    chat_history = []

    while True:
        try:
            question = input("  You: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\n\n  Goodbye! Good luck with your studies! 🎓\n")
            break

        if not question:
            continue

        if question.lower() in ("quit", "exit", "bye"):
            print("\n  Goodbye! Good luck with your studies! 🎓\n")
            break

        print("\n  🤔 Searching PSU database...\n")

        try:
            result = agent.ask(question, chat_history)

            print(f"  DegreeFlow: {result['answer']}")
            print_sources(result["sources"])
            print(f"\n  [{result['pages_found']} pages · {result['courses_found']} courses searched]\n")
            print("-"*60)

            # Keep last 6 messages for context
            chat_history.append({"role": "user", "content": question})
            chat_history.append({"role": "assistant", "content": result["answer"]})
            if len(chat_history) > 12:
                chat_history = chat_history[-12:]

        except Exception as e:
            print(f"  ❌ Error: {e}\n")

    agent.close()


if __name__ == "__main__":
    main()