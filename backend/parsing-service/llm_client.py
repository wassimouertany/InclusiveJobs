import os

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

_llm_instance = None


def get_llm():
    global _llm_instance
    if _llm_instance is None:
        groq_key = os.getenv("GROQ_API_KEY", "")
        if groq_key:
            from langchain_groq import ChatGroq
            _llm_instance = ChatGroq(
                model="openai/gpt-oss-120b",
                api_key=groq_key,
                temperature=0,
                max_tokens=1000,
            )
        else:
            _llm_instance = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                temperature=1,
                thinking={"type": "disabled"},
            )
    return _llm_instance
