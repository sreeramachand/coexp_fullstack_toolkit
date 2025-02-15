import { useState } from "react";

const EdgeListUploader = ({ onGraphLoaded }) => {
  const [fileContent, setFileContent] = useState("");

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setFileContent(text);

      // Parse into an array of edges
      const edges = text
        .trim()
        .split("\n")
        .map((line) => line.split(" "));

      onGraphLoaded(edges); // Pass edges to the parent component
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <input type="file" accept=".edgelist,.txt" onChange={handleFileUpload} />
    </div>
  );
};

export default EdgeListUploader;