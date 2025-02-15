from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS, cross_origin 
import pandas as pd
import networkx as nx
import scipy.stats
import spacy
import os
import pickle
import random
import re
import time
from pathlib import Path

current_dir = Path(os.path.abspath(__file__).replace("app.py", ""))


app = Flask(__name__)
CORS(app)  # Allow cross-origin requests



PICKLE_DIR = f"{current_dir}/pickles"
os.makedirs(PICKLE_DIR, exist_ok=True)

# Load NLP Model
nlp = spacy.load("en_core_web_sm")

def detect_gene_column(df: pd.DataFrame) -> str:
    column_scores = {}

    for col in df.columns:
        sample_values = df[col].dropna().astype(str).sample(min(20, len(df)))
        unique_values = sample_values.nunique()
        score = 0

        for val in sample_values:
            if re.match(r"^[A-Z0-9-]+$", val):  
                score += 2
            doc = nlp(val)
            for token in doc:
                if token.ent_type_ in ["ORG", "GPE", "PRODUCT"] or val.isupper():
                    score += 1

        column_scores[col] = (score / len(sample_values)) * (unique_values / len(sample_values))

    detected_column = max(column_scores, key=column_scores.get)
    return detected_column if column_scores[detected_column] > 0.3 else None  

def find_gene_start_row(df: pd.DataFrame, gene_column: str) -> int:
    for idx, value in enumerate(df[gene_column].dropna()):  
        if isinstance(value, str) and len(value) > 1:
            return df.index[idx]  
    return None

def save_to_pickle(data, filename):
    filepath = os.path.join(PICKLE_DIR, filename)
    with open(filepath, "wb") as f:
        pickle.dump(data, f)

def load_from_pickle(filename):
    filepath = os.path.join(PICKLE_DIR, filename)
    print(filepath)
    if os.path.exists(filepath):
        with open(filepath, "rb") as f:
            return pickle.load(f)
    return None

@app.route("/upload", methods=["GET","POST"])
@cross_origin(allow_headers=["*"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    filename = os.path.splitext(file.filename)[0] + ".pkl"

    df = pd.read_excel(file, engine="pyxlsb")
    save_to_pickle(df, filename)

    return jsonify({"message": f"File {filename} uploaded and processed", "pickle_file": filename})

@app.route("/load-pickles", methods=["GET", "POST"])
@cross_origin(allow_headers=["*"])
def get_pickle_files():
    files = [f for f in os.listdir(PICKLE_DIR) if f.endswith(".pkl")]
    return jsonify({"pickle_files": files})

@app.route("/load/<filename>", methods=["GET"])
@cross_origin(allow_headers=["*"])
def load_pickle(filename):
    df = pd.DataFrame(load_from_pickle(filename))
    if df is None:
        return jsonify({"error": "File not found"}), 404
    return jsonify({"columns": df.columns.tolist(), "rows": df.head(10).to_dict(orient="records")})

@app.route("/process", methods=["GET","POST", "PUT"])
@cross_origin(allow_headers=["*"])
def process_data():
    data = request.json
    print(data)
    filename = data.get("filename")
    values_list = data.get("values", [])

    df = pd.DataFrame(load_from_pickle(filename))
    if df is None:
        return jsonify({"error": "File not found"}), 404

    detected_gene_column = detect_gene_column(df)
    gene_start_row = find_gene_start_row(df, detected_gene_column)

    if not detected_gene_column or gene_start_row is None:
        return jsonify({"error": "Could not detect gene column"}), 400

    df = df.iloc[gene_start_row:]
    index_df = df.columns.get_loc(detected_gene_column)
    df = df.iloc[:,index_df:]
    df = df[df[detected_gene_column].isin(values_list)]

    Gn = nx.Graph()
    Gn.add_nodes_from(values_list)

    normal_pval = []
    for locator1 in df.index:
        for locator2 in df.index:
            if locator1 != locator2:
                val1 = pd.Series(df.loc[locator1][1:], dtype=float)
                val2 = pd.Series(df.loc[locator2][1:], dtype=float)
                r, p_val = scipy.stats.pearsonr(val1, val2)
                if p_val < 0.00000005:
                    normal_pval.append((p_val, r, df.loc[locator1][0], df.loc[locator2][0]))

    edgelist_path = f"{PICKLE_DIR}/edgelist_{random.randint(100,100000)}.txt"
    with open(edgelist_path, "w") as f:
        for p_val, r, g1, g2 in normal_pval:
            f.write(f"{g1} {g2} {r}\n")

    return jsonify({"message": "Graph processed", "edgelist": edgelist_path})

UPLOAD_FOLDER = "pickles"  # Adjust this to the correct folder
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

@app.route("/download/<filename>", methods=["GET"])
def download_file(filename):
    filename = os.path.basename(filename)  # Ensures only filename is used
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)

    if os.path.exists(file_path):
        response = send_from_directory(app.config["UPLOAD_FOLDER"], filename, as_attachment=True)
        
        return response

    return jsonify({"error": "File not found"}), 404

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, use_reloader=True, debug=True)
