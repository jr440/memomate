# memomate.py - Corrected Version

import speech_recognition as sr
import requests
import json
import time

# URL for your core AI service's summarization endpoint
ai_service_url = "http://127.0.0.1:5000/summarize"

# A global variable to store the full transcript
full_transcript = []

# A filename to save the transcript
transcript_filename = "memomate_transcript.txt"

def callback(recognizer, audio):
    """
    This function is called continuously in the background
    whenever speech is detected.
    """
    try:
        # Use Google's Web Speech API to convert audio to text
        text = recognizer.recognize_google(audio)
        print("Heard:", text)
        full_transcript.append(text)
    except sr.UnknownValueError:
        print("Could not understand audio.")
    except sr.RequestError as e:
        print(f"Could not request results from the service; {e}")

def get_summary_from_ai(text_to_summarize):
    """
    Sends the full text to the AI service for summarization.
    """
    try:
        data = {"text": text_to_summarize}
        print("Sending full transcript to AI service for summary...")
        
        response = requests.post(ai_service_url, json=data)
        response.raise_for_status()
        
        summary_data = response.json()
        print("\n--- MemoMate Final Summary ---")
        print(summary_data['summary'])

    except requests.exceptions.RequestException as e:
        print(f"Error communicating with the AI service: {e}")

def save_transcript_to_file():
    """
    Saves the full transcript to a text file.
    """
    print(f"Saving transcript to {transcript_filename}...")
    with open(transcript_filename, "w") as f:
        f.write("\n".join(full_transcript))
    print("Transcript saved.")

if __name__ == '__main__':
    r = sr.Recognizer()
    
    # We must first enter the context manager to prepare the source
    with sr.Microphone() as source:
        # Adjust for ambient noise once at the beginning
        r.adjust_for_ambient_noise(source)
    
    print("Listening for 1 hour... Press Ctrl+C to stop.")
    
    # Now, start listening in the background, using the prepared source
    stop_listening = r.listen_in_background(source, callback)
    
    try:
        # Let the script run for a long time (e.g., 3600 seconds for 1 hour)
        time.sleep(3600)
    except KeyboardInterrupt:
        print("\nRecording stopped by user.")
    finally:
        stop_listening(wait_for_stop=False)
        
        full_text = " ".join(full_transcript)
        
        save_transcript_to_file()
        
        if full_text:
            get_summary_from_ai(full_text)
        else:
            print("No speech was detected during the recording.")