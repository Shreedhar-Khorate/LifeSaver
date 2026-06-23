from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Life Saver API")

# Configure CORS (from PRD Known Problems & Solutions - Problem 8)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Life Saver API is running successfully!"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "Life Saver Backend"}
