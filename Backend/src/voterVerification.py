from flask import Flask, request, jsonify
import cv2
import requests
import face_recognition
import numpy as np
from PIL import Image
import io
import json

app = Flask(__name__)

@app.route("/verify", methods=["POST", "GET"])
def verify():
    try:
        data = request.json 
        imageLink = data.get("imageLink")

        if not imageLink:
            return jsonify({"error": "No image link provided"}), 400

        response = requests.get(imageLink)
        if response.status_code != 200:
            return jsonify({"error": "Failed to fetch image"}), 400

        image = Image.open(io.BytesIO(response.content)).convert("RGB")
        image_array = np.array(image)

        stored_encodings = face_recognition.face_encodings(image_array)
        if len(stored_encodings) == 0:
            return jsonify({"error": "No face detected in provided image"}), 400

        stored_encoding = stored_encodings[0] 

        cam = cv2.VideoCapture(0) 
        if not cam.isOpened():
            return jsonify({"error": "Failed to access webcam"}), 500
        
        ret, live_frame = cam.read()
        cam.release()

        if not ret:
            return jsonify({"error": "Failed to capture live image"}), 500

        
        live_frame = cv2.cvtColor(live_frame, cv2.COLOR_BGR2RGB)

        
        live_encoding = face_recognition.face_encodings(live_frame)
        
        if len(live_encoding) == 0:
            return jsonify({"error": "No face detected in live image"}), 400

        live_encoding = live_encoding[0]

        distance = face_recognition.face_distance([stored_encoding], live_encoding)[0]
        match = distance < 0.6 

        response_data = {
            "message": "Verification successful!" if match else "Face mismatch!",
            "match_confidence": round((1 - distance) * 100, 2)
        }
        print(json.dumps(response_data))
        return jsonify(response_data), 200 if match else 403

    except Exception as e:
        error_response = {"error": str(e)}
        print(json.dumps(error_response))
        return jsonify(error_response), 500

if __name__ == "__main__":
    app.run()


    #http://127.0.0.1:5000/verify
#//copy src\\voterVerification.py dist\\ && 