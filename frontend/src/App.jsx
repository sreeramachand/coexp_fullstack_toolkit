import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";
import EdgeListUploader from "./EdgeListUploader";
import GraphVisualization from "./GraphVisualization";
import GraphAnalysis from "./GraphAnalysis";


function App() {
    const [file, setFile] = useState(null);
    const [files, setFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState("");
    const [geneValues, setGeneValues] = useState("");
    const [edgelist, setEdgeList] = useState("");
    const [edges, setEdges] = useState([]);

    const handleGraphLoaded = (parsedEdges) => {
        setEdges(parsedEdges);
        const graph = processGraph(parsedEdges);
      };

    // Fetch list of pickle files
    const fetchFiles = async () => {
        try {
            const res = await axios.get("http://localhost:5000/load-pickles");
            setFiles(res.data.pickle_files);
        } catch (error) {
            console.error("Error fetching pickle files:", error);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, []);

    // Upload File
    const uploadFile = async () => {
        if (!file) {
            alert("Please select a file first.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            await axios.post("http://localhost:5000/upload", formData);
            alert("File uploaded successfully!");
            setFile(null);
            fetchFiles(); // Refresh file list after upload
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Failed to upload file.");
        }
    };

    // Process File
    const processFile = async () => {
        if (!selectedFile || !geneValues) {
            alert("Select a file and enter gene values first.");
            return;
        }

        try {
            const response = await axios.post("http://localhost:5000/process", {
                filename: selectedFile,
                values: geneValues.split("\n").map((v) => v.trim()),
            });

            if (response.data.edgelist) {
                setEdgeList(response.data.edgelist);
                alert("Processing complete! You can now download the edgelist.");
            } else {
                alert("Processing failed.");
            }
        } catch (error) {
            console.error("Processing failed:", error);
            alert("Failed to process file.");
        }
    };

    // Download File
    const downloadFile = async () => {
        if (!edgelist) {
            alert("No processed edgelist found. Please process a file first.");
            return;
        }
    
        // Extract only the filename from the full path
        const fileName = edgelist.split("/").pop().split("\\").pop();  
    
        try {
            const response = await axios.get(`http://localhost:5000/download/${fileName}`, {
                responseType: "blob",
            });
    
            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", fileName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
    
            alert("Download started!");
        } catch (error) {
            console.error("Download failed:", error);
            alert("Failed to download file.");
        }
    };

    
    

    return (
        <div className="centered-primary-div">
            <h1>Gene Co-expression Analysis Toolkit</h1>

            <h3>Instructions</h3>
            <ol>
                <li>Upload an Excel file containing gene expression data.</li>
                <li>Obtain this from either LinkedOmics for TCGA data or GTEX Portal for GTEX data.</li>
                <li>LinkedOmics: <a href="https://www.linkedomics.org/login.php" target="_blank">LinkedOmics</a></li>
                <li>GTEX Portal: <a href="https://www.gtexportal.org/home/downloads/adult-gtex/bulk_tissue_expression" target="_blank">GTEX Portal</a></li>
                <li>Enter a trial name and a list of gene values.</li>
                <li>Obtain this from CBioPortal at the following link: <a href="https://www.cbioportal.org/" target="_blank">CBioPortal</a>.</li>
                <li>For further analysis, download the edgelist file and import into Cytoscape, Gephi, and Tulip!! Happy coding!!</li>
            </ol>

            <h3>Upload an Excel File</h3>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} />
            <button onClick={uploadFile}>Upload</button>

            <h3>Select a Pickle File</h3>
            <select onChange={(e) => setSelectedFile(e.target.value)} value={selectedFile}>
                <option value="">-- Select a File --</option>
                {files.map((f) => (
                    <option key={f} value={f}>{f}</option>
                ))}
            </select>

            <h3>Enter Gene Values (One Per Line)</h3>
            <textarea class="txt-area1" onChange={(e) => setGeneValues(e.target.value)} value={geneValues}></textarea>
            <button onClick={processFile}>Process</button>

            <h3>Download Edgelist File</h3>
            <button onClick={downloadFile} disabled={!edgelist}>
                {edgelist ? "Download Here" : "No File to Download"}
            </button>

            <h3>Graphs & Analysis</h3>
            <div>
                <EdgeListUploader onGraphLoaded={handleGraphLoaded} />
                <GraphVisualization edges={edges} />
            </div>
                
                <GraphAnalysis edges={edges} />
                

        </div>
    );
}

export default App;
