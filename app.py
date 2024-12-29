from flask import Flask, render_template, request, send_file, jsonify
from gtts import gTTS
import os
import tempfile
from datetime import datetime
import uuid

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/<language>")
def language_page(language):
    return render_template("index.html")

@app.route("/convert", methods=["POST"])
def convert_text_to_speech():
    try:
        # Get form data
        text = request.form.get("text")
        language = request.form.get("language", "en")
        speed = float(request.form.get("speed", 1.0))
        
        if not text or not text.strip():
            return jsonify({"error": "Please enter valid text"}), 400

        # Create temporary file
        temp_dir = tempfile.gettempdir()
        temp_filename = f"speech_{uuid.uuid4()}.mp3"
        temp_filepath = os.path.join(temp_dir, temp_filename)

        # Convert text to speech
        tts = gTTS(text=text, lang=language.split('-')[0], slow=(speed < 1.0))
        tts.save(temp_filepath)

        # Send file and delete after sending
        return send_file(
            temp_filepath,
            mimetype="audio/mpeg",
            as_attachment=True,
            download_name=temp_filename
        )

    except Exception as e:
        print(f"Error during conversion: {str(e)}")
        return jsonify({"error": "An error occurred during conversion"}), 500

    finally:
        # Clean up temporary file
        try:
            if os.path.exists(temp_filepath):
                os.remove(temp_filepath)
        except:
            pass

if __name__ == "__main__":
    app.run(debug=True)
