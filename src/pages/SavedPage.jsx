import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  Panel, 
  useNodesState,
  useEdgesState, 
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges
} from 'reactflow';
import "reactflow/dist/style.css";
import ErrorBoundary from '../components/ErrorBoundary';
import RoadmapNode from '../components/RoadmapNode';
import SimpleRoadmapNode from '../components/SimpleRoadmapNode';
import NodeEditor from '../components/NodeEditor';
import CustomEdge from '../components/CustomEdge';
import SimplifiedCustomEdge from '../components/SimplifiedCustomEdge';
import '../styles/SavedPage.css';
import '../styles/ReactFlowFixes.css';

// Move these outside the component to prevent unnecessary re-renders
const nodeTypes = {
  roadmapNode: SimpleRoadmapNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

function SavedPage() {
  const navigate = useNavigate();
  const [savedRoadmaps, setSavedRoadmaps] = useState([]);
  const [activeRoadmaps, setActiveRoadmaps] = useState([]);
  const [inactiveRoadmaps, setInactiveRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentRoadmap, setCurrentRoadmap] = useState(null);
  const [isViewingRoadmap, setIsViewingRoadmap] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isRoadmapEditable, setIsRoadmapEditable] = useState(true);
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${baseUrl}/api/requests`);
      if (res.ok) {
        const json = await res.json();
        setRequests(Array.isArray(json) ? json.slice(0,10) : []);
      }
    } catch (err) { console.error('Failed to load requests', err); }
    finally { setRequestsLoading(false); }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Helper function to show temporary messages (consistent with GeneratorPage)
  const showTemporaryMessage = useCallback((text, type = 'success') => {
    const message = document.createElement('div');
    message.className = `temporary-message ${type}`;
    message.textContent = `✓ ${text}`;
    document.body.appendChild(message);

    // Trigger animation
    requestAnimationFrame(() => message.classList.add('show'));

    setTimeout(() => {
      message.classList.remove('show');
      setTimeout(() => {
        if (message.parentNode) message.parentNode.removeChild(message);
      }, 220);
    }, 2000);
  }, []);
  
  // Implement custom node change handler for better control
  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  // Implement custom edge change handler for better control
  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const fetchRoadmaps = useCallback(async () => {
    setLoading(true);
    try {
  const baseUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${baseUrl}/api/roadmaps`);
      if (!response.ok) {
        throw new Error('Failed to fetch roadmaps');
      }
      const data = await response.json();
      setSavedRoadmaps(data);
      setActiveRoadmaps(data.filter(item => item.active));
      setInactiveRoadmaps(data.filter(item => !item.active));
    } catch (error) {
      console.error('Error fetching roadmaps:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoadmaps();
  }, [fetchRoadmaps]);

  const viewRoadmap = useCallback((roadmap) => {
    setCurrentRoadmap(roadmap);
    setIsViewingRoadmap(true);
    
    // Check if data is in the new format (object with roadmap and edges) or old format (direct array)
    let roadmapData = roadmap.data;
    let edgesData = [];
    
    // Handle new format (post update)
    if (roadmapData && typeof roadmapData === 'object' && !Array.isArray(roadmapData)) {
      edgesData = roadmapData.edges || [];
      roadmapData = roadmapData.roadmap || [];
    }
    
    // Validate roadmap data
    if (!Array.isArray(roadmapData) || roadmapData.length === 0) {
      console.error('Invalid roadmap data:', roadmapData);
      return;
    }
    
    // Clear previous nodes and edges first
    setNodes([]);
    setEdges([]);
    
    const nodeWidth = 250;
    const nodeHeight = 150;
    
    // Create nodes with saved positions if available
    const flowNodes = roadmapData.map((step, index) => {
      const nodeId = step.id.toString();
      
      // Use saved position if available, otherwise use grid layout
      let position;
      if (step.position && step.position.x !== undefined && step.position.y !== undefined) {
        position = step.position;
      } else {
        const row = Math.floor(index / 3);
        const col = index % 3;
        position = { 
          x: col * (nodeWidth + 100) + 50, 
          y: row * (nodeHeight + 100) + 50 
        };
      }
      
      // Ensure description is not empty
      let description = step.description;
      if (!description) {
        description = `Details for ${step.title || 'this step'}`;
      }
      
      return {
        id: nodeId,
        type: 'roadmapNode',
        position,
        data: { 
          title: step.title || 'Untitled Step',
          description: description,
          estimated_time: step.estimated_time || 'Unknown',
          // attach edit/delete handlers so the node buttons work in Saved view
          onEdit: (id) => {
            // Use setNodes to find the current node state
            setNodes(currentNodes => {
              const found = currentNodes.find(n => n.id === id);
              if (found) {
                setSelectedNode(found);
                setIsEditing(true);
              }
              return currentNodes; // Return unchanged nodes
            });
          },
          onDelete: (id) => {
            if (window.confirm('Delete this step?')) {
              // remove node and related edges
              setNodes(prev => prev.filter(n => n.id !== id));
              setEdges(prev => prev.filter(e => e.source !== id && e.target !== id));
            }
          },
          nodeId: nodeId
        }
      };
    });
    
    // Use saved edges if available, otherwise create default connections
    let flowEdges = [];
    if (edgesData && Array.isArray(edgesData) && edgesData.length > 0) {
      console.log('Using saved edges:', edgesData);
      
      // Use the saved edges, ensure all required properties are present
      flowEdges = edgesData.map(edge => {
        // Make sure edge has both source and target
        if (!edge.source || !edge.target) {
          console.error('Edge missing source or target:', edge);
          return null;
        }
        
        // Simplify handle assignment - just use 'source' and 'target'
        // This avoids issues with dynamic handle IDs
        const sourceHandleId = 'source';
        const targetHandleId = 'target';
        
        console.log(`Creating edge ${edge.id}: source=${edge.source}, target=${edge.target}`);
        
        const edgeObj = {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          markerEnd: { type: MarkerType.ArrowClosed },
          type: 'custom',
          animated: true,
          sourceHandle: sourceHandleId,
          targetHandle: targetHandleId,
          data: {
            // Add some extra data to help debug
            originalSourceHandle: edge.sourceHandle,
            originalTargetHandle: edge.targetHandle,
            // deletion callback used by CustomEdge
            onDelete: (edgeId) => {
              setEdges((current) => current.filter((ed) => ed.id !== edgeId));
            }
          }
        };
        
        return edgeObj;
      }).filter(edge => edge !== null);
    } else {
      // Create default edges as a fallback (simple tree structure)
      for (let i = 1; i < roadmapData.length; i++) {
        const sourceIdx = Math.floor((i - 1) / 2);
        const sourceId = roadmapData[sourceIdx].id.toString();
        const targetId = roadmapData[i].id.toString();
        flowEdges.push({
          id: `e${sourceId}-${targetId}`,
          source: sourceId,
          target: targetId,
          // Don't specify handles for default connections - let ReactFlow figure it out
          markerEnd: { type: MarkerType.ArrowClosed },
          type: 'custom',
          animated: true,
          data: {
            onDelete: (edgeId) => {
              setEdges((current) => current.filter((ed) => ed.id !== edgeId));
            }
          }
        });
      }
    }
    
      // Apply the nodes and edges
    console.log('Setting nodes:', flowNodes.length);
    console.log('Setting edges:', flowEdges.length);
    
    // Make sure the edge source and target nodes exist and simplify handle logic
    const validEdges = flowEdges.filter(edge => {
      const sourceNodeExists = flowNodes.some(node => node.id === edge.source);
      const targetNodeExists = flowNodes.some(node => node.id === edge.target);
      
      if (!sourceNodeExists || !targetNodeExists) {
        console.warn(`Edge ${edge.id} has invalid source/target nodes`);
        return false;
      }
      
      // Always use standard 'source' and 'target' handles for simplicity
      edge.sourceHandle = 'source';
      edge.targetHandle = 'target';
      
      return true;
    });    if (validEdges.length !== flowEdges.length) {
      console.warn(`Filtered out ${flowEdges.length - validEdges.length} invalid edges`);
    }
    
    // Use the callback form to ensure clean state updates
    setNodes(() => flowNodes);
    setEdges(() => validEdges);
    
    console.log('Final nodes set:', flowNodes.length);
    console.log('Final edges set:', validEdges.length);
  }, [setNodes, setEdges]);

  const closeRoadmapView = () => {
    setIsViewingRoadmap(false);
    setCurrentRoadmap(null);
    setNodes([]);
    setEdges([]);
  };

  const toggleRoadmapEdit = () => {
    setIsRoadmapEditable(prev => !prev);
  };

  const addNewNodeToView = () => {
    // Open the NodeEditor to create a new node
    setSelectedNode(null);
    setIsAddingNode(true);
  };

  // Handle connect in edit mode
  const handleConnect = useCallback((params) => {
    if (!isRoadmapEditable) return;
    // Prevent self connections
    if (params.source === params.target) return;
    const edgeId = `e${params.source}-${params.target}`;
    // Avoid duplicates
    setEdges(prev => {
      if (prev.some(e => e.source === params.source && e.target === params.target)) return prev;
      const newEdge = {
        id: edgeId,
        source: params.source,
        target: params.target,
        type: 'custom',
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: true,
        sourceHandle: params.sourceHandle || `source-${params.source}`,
        targetHandle: params.targetHandle || `target-${params.target}`,
        data: {
          onDelete: (edgeIdToRemove) => setEdges((current) => current.filter((ed) => ed.id !== edgeIdToRemove))
        }
      };
      return [...prev, newEdge];
    });
  }, [isRoadmapEditable]);

  const saveAllChanges = async () => {
    if (!currentRoadmap) return;
    try {
  const baseUrl = import.meta.env.VITE_API_URL;
      // Build roadmap payload from nodes array
      const payloadRoadmap = nodes.map(n => ({ id: n.id, title: n.data?.title || '', description: n.data?.description || '', estimated_time: n.data?.estimated_time || '', position: n.position }));
      const payloadEdges = edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle, type: e.type }));

      const body = { roadmap: payloadRoadmap, edges: payloadEdges };
      const res = await fetch(`${baseUrl}/api/roadmaps/${currentRoadmap.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Save failed');
      }
      const updated = await res.json();
  setCurrentRoadmap(updated);
  setIsRoadmapEditable(false);
  showTemporaryMessage('Roadmap saved successfully', 'success');
  fetchRoadmaps();
    } catch (err) {
      console.error('Failed to save roadmap:', err);
      showTemporaryMessage('Failed to save roadmap: ' + (err.message || err), 'error');
    }
  };

  const toggleActive = async (roadmapId, currentActiveState) => {
    try {
  const baseUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${baseUrl}/api/roadmaps/${roadmapId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActiveState }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update roadmap status');
      }
      
      // Refresh the list after successful update
      fetchRoadmaps();
    } catch (error) {
      console.error('Error updating roadmap status:', error);
      alert('Failed to update roadmap status. Please try again.');
    }
  };

  const handleDelete = async (roadmapId) => {
    setDeleteConfirmId(roadmapId);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/roadmaps/${deleteConfirmId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete roadmap');
      }
      
      // Close confirmation dialog and refresh list
      setDeleteConfirmId(null);
      fetchRoadmaps();
      
      // If currently viewing the deleted roadmap, close the view
      if (currentRoadmap && currentRoadmap.id === deleteConfirmId) {
        closeRoadmapView();
      }
    } catch (error) {
      console.error('Error deleting roadmap:', error);
      alert('Failed to delete roadmap. Please try again.');
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const goToGenerator = () => {
    navigate('/');
  };
  
  // Edge click handler for viewer: confirm and delete
  const handleEdgeClick = useCallback((event, edgeOrId) => {
    event.stopPropagation();
    // edgeOrId can be an edge object (from React Flow) or an id string (from our CustomEdge)
    const edgeId = edgeOrId && typeof edgeOrId === 'object' ? edgeOrId.id : edgeOrId;
    const confirmDelete = window.confirm('Delete this connection?');
    if (!confirmDelete) return;
    setEdges(prev => prev.filter(e => e.id !== edgeId));
    showTemporaryMessage('Connection deleted', 'error');
  }, [setEdges]);

  // Handle save from NodeEditor (create or update)
  const handleSaveNode = useCallback((nodeData) => {
    if (isAddingNode) {
      const newNodeId = `new-${Date.now()}`;
      const position = { x: 120 + nodes.length * 30, y: 120 + nodes.length * 30 };
      
      // Update nodes with proper handlers
      setNodes(prev => [...prev, {
        id: newNodeId,
        type: 'roadmapNode',
        position,
        data: { 
          title: nodeData.title, 
          description: nodeData.description, 
          estimated_time: nodeData.estimated_time,
          onEdit: (id) => {
            setNodes(currentNodes => {
              const found = currentNodes.find(n => n.id === id);
              if (found) {
                setSelectedNode(found);
                setIsEditing(true);
              }
              return currentNodes;
            });
          },
          onDelete: (id) => {
            if (window.confirm('Delete this step?')) {
              setNodes(prev => prev.filter(n => n.id !== id));
              setEdges(prev => prev.filter(e => e.source !== id && e.target !== id));
            }
          }
        }
      }]);
      setIsAddingNode(false);
    } else if (isEditing && selectedNode) {
      // Update node content while preserving handlers
      setNodes(prev => prev.map(n => 
        n.id === selectedNode.id 
          ? { 
              ...n, 
              data: { 
                ...n.data, 
                title: nodeData.title, 
                description: nodeData.description, 
                estimated_time: nodeData.estimated_time 
              } 
            } 
          : n
      ));
      setIsEditing(false);
      setSelectedNode(null);
    }
  }, [isAddingNode, isEditing, selectedNode, nodes]);

  // Filter active roadmaps based on search query
  const filteredActiveRoadmaps = useMemo(() => {
    if (!searchQuery.trim()) return activeRoadmaps;
    
    const query = searchQuery.toLowerCase();
    return activeRoadmaps.filter(roadmap => 
      roadmap.title.toLowerCase().includes(query) ||
      (roadmap.data && Array.isArray(roadmap.data) && 
        roadmap.data.some(step => 
          step.title?.toLowerCase().includes(query) ||
          step.description?.toLowerCase().includes(query)
        )
      )
    );
  }, [activeRoadmaps, searchQuery]);

  return (
    <div className="page saved-page">
      <header className="app-header">
        <div className="logo">
          <span className="logo-text">Roadmap Generator</span>
        </div>
        <nav>
          
        </nav>
      </header>
      
      <div className="page-content">
        {!isViewingRoadmap ? (
          <div className="roadmaps-container">
            {/* Collapsible Requested Roadmaps Section */}
            <div className="requests-section" style={{ marginBottom: 24 }}>
              <button 
                className="requests-toggle-btn"
                onClick={() => setShowRequests(!showRequests)}
              >
                <span className="toggle-icon">{showRequests ? '▼' : '▶'}</span>
                <span>Requested Roadmaps</span>
                <span className="request-count">({requests.length})</span>
              </button>
              
              {showRequests && (
                <div className="requests-content">
                  {requestsLoading ? (
                    <div className="loading-state">
                      <div className="loader"></div>
                      <p>Loading requests...</p>
                    </div>
                  ) : requests.length === 0 ? (
                    <div className="empty-requests">No requested roadmaps</div>
                  ) : (
                    <div className="requests-grid">
                      {requests.map(r => (
                        <div key={r.id} className="request-card">
                          <div className="request-header">
                            <h4>{r.title}</h4>
                            <span className={`status-badge status-${r.status.toLowerCase()}`}>
                              {r.status}
                            </span>
                          </div>
                          <div className="request-meta">
                            Generated on: {new Date(r.created_at).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </div>
                          <div className="request-description">
                            {r.description || 'No description provided'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <h1>Saved Roadmaps</h1>
            
            {loading ? (
              <div className="loading-state">
                <div className="loader"></div>
                <p>Loading saved roadmaps...</p>
              </div>
            ) : savedRoadmaps.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📂</div>
                <h2>No Saved Roadmaps</h2>
                <p>You haven't saved any roadmaps yet.</p>
                <button className="primary-btn" onClick={goToGenerator}>Create a Roadmap</button>
              </div>
            ) : (
              <>
                {activeRoadmaps.length > 0 && (
                  <div className="roadmap-section">
                    <div className="section-header">
                      <h2>Active Roadmaps</h2>
                      <div className="search-bar">
                        <input
                          type="text"
                          placeholder="Search active roadmaps..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="search-input"
                        />
                        {searchQuery && (
                          <button 
                            className="clear-search"
                            onClick={() => setSearchQuery('')}
                            title="Clear search"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                    {filteredActiveRoadmaps.length === 0 ? (
                      <div className="no-results">
                        <p>No roadmaps found matching "{searchQuery}"</p>
                      </div>
                    ) : (
                      <div className="roadmap-grid">
                        {filteredActiveRoadmaps.map(roadmap => (
                        <div key={roadmap.id} className="roadmap-card active">
                          <div className="roadmap-card-header">
                            <h3>{roadmap.title}</h3>
                            <div className="roadmap-actions">
                              <button 
                                className="icon-button toggle-active"
                                onClick={() => toggleActive(roadmap.id, roadmap.active)}
                                title="Set as inactive"
                              >
                                ⭐
                              </button>
                              <button 
                                className="icon-button delete"
                                onClick={() => handleDelete(roadmap.id)}
                                title="Delete roadmap"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                          <div className="roadmap-card-body">
                            <div className="roadmap-meta">
                              Created: {new Date(roadmap.created_at).toLocaleDateString()}
                            </div>
                            <div className="roadmap-stats">
                              {roadmap.data && Array.isArray(roadmap.data) && 
                                `${roadmap.data.length} steps`}
                            </div>
                          </div>
                          <div className="roadmap-card-footer">
                            <button 
                              className="view-btn"
                              onClick={() => viewRoadmap(roadmap)}
                            >
                              View Roadmap
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    )}
                  </div>
                )}
                
                {inactiveRoadmaps.length > 0 && (
                  <div className="roadmap-section">
                    <h2>Other Roadmaps</h2>
                    <div className="roadmap-grid">
                      {inactiveRoadmaps.map(roadmap => (
                        <div key={roadmap.id} className="roadmap-card">
                          <div className="roadmap-card-header">
                            <h3>{roadmap.title}</h3>
                            <div className="roadmap-actions">
                              <button 
                                className="icon-button toggle-inactive"
                                onClick={() => toggleActive(roadmap.id, roadmap.active)}
                                title="Set as active"
                              >
                                ☆
                              </button>
                              <button 
                                className="icon-button delete"
                                onClick={() => handleDelete(roadmap.id)}
                                title="Delete roadmap"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                          <div className="roadmap-card-body">
                            <div className="roadmap-meta">
                              Created: {new Date(roadmap.created_at).toLocaleDateString()}
                            </div>
                            <div className="roadmap-stats">
                              {roadmap.data && Array.isArray(roadmap.data) && 
                                `${roadmap.data.length} steps`}
                            </div>
                          </div>
                          <div className="roadmap-card-footer">
                            <button 
                              className="view-btn"
                              onClick={() => viewRoadmap(roadmap)}
                            >
                              View Roadmap
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="roadmap-viewer">
            <div className="viewer-header">
              <h2>{currentRoadmap?.title}</h2>
              <div className="viewer-actions">
                <button className="primary-btn" onClick={toggleRoadmapEdit}>{isRoadmapEditable ? 'Exit Edit' : 'Edit'}</button>
                {isRoadmapEditable && (
                  <>
                    <button className="add-node-btn" onClick={addNewNodeToView}>Add Node</button>
                    <button className="save-roadmap-btn" onClick={saveAllChanges}>Save All</button>
                  </>
                )}
                <button className="back-btn" onClick={closeRoadmapView}>Back to List</button>
              </div>
            </div>
            
            <div className="flow-container">
              {/* Debug info */}
              {process.env.NODE_ENV !== 'production' && (
                <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 5, background: 'rgba(255, 255, 255, 0.8)', padding: 10, borderRadius: 4 }}>
                  <p>Nodes: {nodes.length}, Edges: {edges.length}</p>
                  <details>
                    <summary>Edge Details</summary>
                    <pre style={{ maxHeight: '200px', overflow: 'auto', fontSize: '11px' }}>
                      {JSON.stringify(edges, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
              
              <ErrorBoundary>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onEdgeClick={handleEdgeClick}
                  onConnect={handleConnect}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                  nodesDraggable={isRoadmapEditable}
                  elementsSelectable={true}
                  nodesConnectable={isRoadmapEditable}
                  elevateEdgesOnSelect={true}
                  connectionMode="strict"
                  maxZoom={2}
                  minZoom={0.1}
                  defaultZoom={0.8}
                  zoomOnScroll={true}
                  panOnScroll={false}
                  panOnDrag={true}
                  selectionOnDrag={false}
                  attributionPosition="bottom-right"
                  snapToGrid={false} 
                  connectionLineStyle={{ stroke: 'var(--accent)', strokeWidth: 2 }}
                  defaultEdgeOptions={{
                    type: 'custom',
                    animated: true,
                    style: { stroke: 'var(--accent)', strokeWidth: 2 },
                    markerEnd: { type: MarkerType.ArrowClosed }
                  }}
                  onInit={(reactFlowInstance) => {
                    // Wait for everything to be properly initialized
                    setTimeout(() => {
                      reactFlowInstance.fitView({ 
                        padding: 0.2, 
                        includeHiddenNodes: false 
                      });
                    }, 200);
                  }}
                >
                  <Controls />
                  <MiniMap />
                  <Background color="#aaa" gap={16} />
                </ReactFlow>
              </ErrorBoundary>
            </div>
          </div>
        )}
      </div>
      
      {/* Delete confirmation modal */}
      {deleteConfirmId && (
        <div className="modal-overlay">
          <div className="modal-content delete-confirm">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete this roadmap? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={cancelDelete}>Cancel</button>
              <button className="delete-btn" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
      {(isAddingNode || isEditing) && (
        <NodeEditor 
          node={isEditing ? selectedNode : null}
          onSave={handleSaveNode}
          onCancel={() => { setIsAddingNode(false); setIsEditing(false); setSelectedNode(null); }}
        />
      )}
    </div>
  );
}

export default SavedPage;