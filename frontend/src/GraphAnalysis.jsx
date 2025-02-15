import React, { useState, useEffect } from 'react';

const GraphAnalysis = ({ edges }) => {
  const [metrics, setMetrics] = useState(null);
  const [isAnalysisDone, setIsAnalysisDone] = useState(false);

  // Function to trigger the graph analysis and display results
  const handleAnalyzeClick = async () => {
    // Load Pyodide and run the analysis
    const pyodide = await loadPyodide();
    await pyodide.loadPackage('networkx'); // Load NetworkX package

    const pythonCode = `
import networkx as nx

def process_graph(edges):
    G = nx.Graph()
    G.add_weighted_edges_from(edges)

    # Graph metrics
    num_nodes = G.number_of_nodes()
    num_edges = G.number_of_edges()
    degree_distribution = dict(G.degree())
    avg_degree = sum(degree_distribution.values()) / num_nodes
    clustering_coefficient = nx.average_clustering(G)
    density = nx.density(G)
    
    # Path-based parameters (only if graph is connected)
    graph_diameter = nx.diameter(G) if nx.is_connected(G) else None
    graph_radius = nx.radius(G) if nx.is_connected(G) else None
    avg_path_length = nx.average_shortest_path_length(G) if nx.is_connected(G) else None
    
    # Centrality measures
    page_rank = nx.pagerank(G)
    betweenness_centrality = nx.betweenness_centrality(G)
    closeness_centrality = nx.closeness_centrality(G)

    return {
        'num_nodes': num_nodes,
        'num_edges': num_edges,
        'degree_distribution': degree_distribution,
        'avg_degree': avg_degree,
        'clustering_coefficient': clustering_coefficient,
        'density': density,
        'graph_diameter': graph_diameter,
        'graph_radius': graph_radius,
        'avg_path_length': avg_path_length,
        'page_rank': page_rank,
        'betweenness_centrality': betweenness_centrality,
        'closeness_centrality': closeness_centrality
    }

process_graph(${JSON.stringify(edges)})
`;

    // Run the Python code in Pyodide
    const result = pyodide.runPython(pythonCode);

    // Set the result to state
    setMetrics(result);
    setIsAnalysisDone(true);
  };

  return (
    <div>
      <button onClick={handleAnalyzeClick}>Analyze Graph</button>

      {isAnalysisDone && (
        <div>
          <h3>Graph Analysis Results:</h3>
          <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', backgroundColor: '#f4f4f4', padding: '10px' }}>
            {JSON.stringify(metrics, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default GraphAnalysis;
