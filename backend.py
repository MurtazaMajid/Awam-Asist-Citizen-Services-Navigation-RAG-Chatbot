import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Question(BaseModel):
    question: str

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

vectordb = Chroma(
    persist_directory="./",
    embedding_function=embeddings
)

llm = ChatGroq(
    groq_api_key=os.environ.get("GROQ_API_KEY"),
    model_name="llama-3.3-70b-versatile"
)

prompt = ChatPromptTemplate.from_template("""
You are a helpful citizen service assistant for Pakistan.
Answer in simple plain language that anyone can understand.
If the user writes in Roman Urdu, reply in Roman Urdu.
If you don't know the answer say "Mujhe is baray mein maloomat nahi, please relevant department se rabta karein."
Keep answers concise and practical.

Context: {context}

Question: {question}
""")

retriever = vectordb.as_retriever(search_kwargs={"k": 3})

chain = (
    {"context": retriever, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

@app.get("/")
def root():
    return {"status": "Citizen Service Navigator API is running"}

@app.post("/ask")
def ask(body: Question):
    try:
        response = chain.invoke(body.question)
        return {"answer": response}
    except Exception as e:
        return {"answer": f"Error: {str(e)}"}
