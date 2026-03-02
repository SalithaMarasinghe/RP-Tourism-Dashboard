import asyncio
import os
from dotenv import load_dotenv
from services.chat_service import handle_ask

async def main():
    load_dotenv()
    # Mock UID and chat ID
    uid = "test-user-123"
    chat_id = "test-chat-123"
    message = "assess the situation of iran and US and how it might affect to sri lankan tourism and what kind of tourist prediction that we can expect for the next 2 months"
    
    print("Sending message...")
    response = await handle_ask(uid, message, chat_id)
    print("\n--- AI RESPONSE ---")
    print(response["response"])
    print("\n--- SOURCES ---")
    print(response["sources"])

if __name__ == "__main__":
    asyncio.run(main())
