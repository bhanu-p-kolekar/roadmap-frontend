import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import ReactFlow, { 
  MiniMap, 
  Controls, 
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
  Handle,
  Position,
  useReactFlow,
  getStraightPath,
  getBezierPath
} from "reactflow";
import "reactflow/dist/style.css";
import '../styles/ReactFlowFixes.css';
import { useNavigate } from "react-router-dom";
import ErrorBoundary from '../components/ErrorBoundary';
import SaveDialog from '../components/SaveDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import RoadmapNode from '../components/RoadmapNode';
import NodeEditor from '../components/NodeEditor';
import CustomEdge from '../components/CustomEdge';

// Custom connection line for a better visual feedback when connecting nodes
const CustomConnectionLine = ({ fromX, fromY, toX, toY }) => {
  const [edgePath] = getBezierPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: Position.Bottom,
    targetX: toX,
    targetY: toY,
    targetPosition: Position.Top,
  });

  return (
    <>
      <path
        d={edgePath}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={3}
        className="animated-connection-path"
        style={{
          strokeDasharray: 5,
          animation: 'flowingDash 1s linear infinite',
        }}
      />
      <circle
        cx={toX}
        cy={toY}
        r={8}
        fill="var(--accent)"
        className="connection-indicator-circle"
        style={{
          animation: 'pulse-handle 1.5s infinite',
          filter: 'drop-shadow(0 0 3px var(--accent))'
        }}
      />
    </>
  );
};

const nodeWidth = 250;
const nodeHeight = 150;

// IMPORTANT: Define nodeTypes and edgeTypes outside the component
// Using memo pattern to avoid re-renders
const nodeTypes = {
  roadmapNode: RoadmapNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

const GeneratorPage = () => {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [roadmap, setRoadmap] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const nodesRef = useRef([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [connectionMode, setConnectionMode] = useState(false);
  const [showConnectionHint, setShowConnectionHint] = useState(true);
  const nextNodeId = useRef(1);
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showReloadDialog, setShowReloadDialog] = useState(false);
  const [pendingDestination, setPendingDestination] = useState(null);

  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${baseUrl}/api/requests`);
      if (res.ok) {
        const json = await res.json();
        // Filter out completed requests
        const pendingRequests = Array.isArray(json) 
          ? json.filter(req => req.status !== 'completed').slice(0,10) 
          : [];
        setRequests(pendingRequests);
      }
    } catch (err) { console.error('Failed to load requests', err); }
    finally { setRequestsLoading(false); }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  
  // Check for intentional reload flag when component mounts
  useEffect(() => {
    const intentionalReload = sessionStorage.getItem('intentionalReload');
    if (intentionalReload) {
      sessionStorage.removeItem('intentionalReload');
    }
  }, []);
  
  // Helper function to show temporary messages - defined early so other functions can use it
  const showTemporaryMessage = useCallback((text, type = 'success') => {
    const message = document.createElement('div');
    message.className = `temporary-message ${type}`;
    message.textContent = `✓ ${text}`;
    message.style.position = 'absolute';
    message.style.top = '20px';
    message.style.right = '20px';
    message.style.padding = '8px 16px';
    message.style.backgroundColor = type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)';
    message.style.color = 'white';
    message.style.borderRadius = '4px';
    message.style.zIndex = '1000';
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
  
  // Store initial node positions in a ref to avoid recreating them
  const initialNodePositions = useRef(new Map());

  // Store a reference to track node position changes
  const nodePositionChangeHandler = useCallback((changes) => {
    changes.forEach((change) => {
      if (change.type === 'position' && change.dragging && change.position) {
        initialNodePositions.current.set(change.id, { ...change.position });
      }
    });
    onNodesChange(changes);
  }, [onNodesChange]);
  
  // Handle connection start - visual feedback
  // Handle new edge connections
  const handleConnect = useCallback((params) => {
    console.log('Connection attempt:', params);
    
    // Create a unique edge ID
    const edgeId = `e${params.source}-${params.target}`;
    
    // Check if this connection already exists
    const connectionExists = edges.some(
      edge => edge.source === params.source && edge.target === params.target
    );
    
    // Prevent self-connections
    if (params.source === params.target) {
      console.log('Self-connection prevented');
      showTemporaryMessage('Cannot connect a node to itself', 'error');
      return;
    }
    
    if (!connectionExists) {
      console.log('Creating new edge:', edgeId);
      
      // Use node-specific handle IDs
      const sourceHandleId = `source-${params.source}`;
      const targetHandleId = `target-${params.target}`;
      
      const newEdge = {
        id: edgeId,
        source: params.source,
        target: params.target,
        markerEnd: { type: MarkerType.ArrowClosed },
        type: 'custom',
        animated: true,
        style: { stroke: 'var(--accent)', strokeWidth: 2 },
        data: { deletable: true, onDelete: (edgeIdToRemove) => setEdges((current) => current.filter((ed) => ed.id !== edgeIdToRemove)) },
        // Use node-specific handle IDs
        sourceHandle: sourceHandleId,
        targetHandle: targetHandleId
      };
      
      setEdges(prev => [...prev, newEdge]);
      
      // Show temporary success message for connection
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);
      
      if (sourceNode && targetNode) {
        const message = document.createElement('div');
        message.className = 'connection-success-message';
        message.textContent = '✓ Connection created';
        message.style.position = 'absolute';
        message.style.top = '20px';
        message.style.right = '20px';
        message.style.padding = '8px 16px';
        message.style.backgroundColor = 'rgba(16, 185, 129, 0.9)';
        message.style.color = 'white';
        message.style.borderRadius = '4px';
        message.style.zIndex = '1000';
        document.body.appendChild(message);
        
        setTimeout(() => {
          document.body.removeChild(message);
        }, 2000);
      }
    }
  }, [edges, setEdges, nodes]);
  
  // Handle edge click for deletion
  const handleEdgeClick = useCallback((event, edgeId) => {
    event.stopPropagation();
    
    const isAltKey = event.altKey;
    const isShiftKey = event.shiftKey;
    
    // Delete with alt/shift key press or show delete prompt
    if (isAltKey || isShiftKey) {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
      
      // Show feedback message
      showTemporaryMessage('Connection deleted', 'error');
    } else {
      const confirmDelete = window.confirm('Delete this connection?');
      if (confirmDelete) {
        setEdges((eds) => eds.filter((e) => e.id !== edgeId));
        
        // Show feedback message
        showTemporaryMessage('Connection deleted', 'error');
      }
    }
  }, [setEdges, showTemporaryMessage]);
  
  // Toggle connection mode
  const toggleConnectionMode = useCallback(() => {
    setConnectionMode(prev => {
      const newMode = !prev;
      
      // Show a message explaining the mode
      showTemporaryMessage(
        newMode ? 'Connection mode activated' : 'Connection mode deactivated',
        newMode ? 'success' : 'info'
      );
      
      // Show the connection hint when entering connection mode
      if (newMode) {
        setShowConnectionHint(true);
      }
      
      return newMode;
    });
  }, [showTemporaryMessage]);

  // Keep nodesRef updated so callbacks can be stable
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && showConnectionHint) {
        // Only hide the connection hint with Escape key
        setShowConnectionHint(false);
        showTemporaryMessage('Connection hint dismissed', 'info');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [connectionMode, toggleConnectionMode, showTemporaryMessage]);
  
  // Update connection mode status in nodes
  useEffect(() => {
    if (nodes.length > 0) {
      setNodes(nds => nds.map(node => ({
        ...node,
        data: {
          ...node.data,
          connectionMode
        }
      })));
    }
  }, [connectionMode, setNodes]);

  // Stable edit handler that reads from nodesRef
  const handleEditNode = useCallback((nodeId) => {
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
      setIsEditing(true);
    }
  }, []);

  // Stable delete handler using functional updates
  const handleDeleteNode = useCallback((nodeId) => {
    if (window.confirm('Are you sure you want to delete this node?')) {
      setRoadmap(prev => prev.filter(step => step.id.toString() !== nodeId));
      setNodes(prev => prev.filter(node => node.id !== nodeId));
      setEdges(prev => prev.filter(
        edge => edge.source !== nodeId && edge.target !== nodeId
      ));
    }
  }, []);

  const generateRoadmap = useCallback(async (requestTitle) => {
    const topicToUse = requestTitle || topic;
    
    if (!topicToUse.trim()) {
      showTemporaryMessage('Please enter a topic first', 'error');
      return;
    }
    
    setLoading(true);
    setRoadmap([]); // Clear old roadmap
    setNodes([]); // Clear old nodes
    setEdges([]); // Clear old edges
    
    try {
  // Ensure VITE_API_URL is set in your environment for production
  const baseUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${baseUrl}/api/generate-roadmap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topicToUse }),
      });
      const data = await response.json();
      // Defensive validation: ensure we received an array
      if (!Array.isArray(data)) {
        console.error('generateRoadmap: API returned invalid roadmap (not an array):', data);
        alert('Failed to generate roadmap: AI returned invalid data. See console for details.');
        setLoading(false);
        return;
      }
      
      // Validate and normalize roadmap data
      const processedData = data.map((step, index) => {
        // Log each incoming step
        console.log(`Processing API step ${index}:`, step);
        
        // Handle potential different casing in API response
        const title = step.title || step.Title || `Step ${index + 1}`;
        
        // Extract description with fallbacks
        let description = '';
        if (step.description) {
          description = step.description;
        } else if (step.Description) {
          description = step.Description;
        } else if (step.content) {
          description = step.content;
        } else if (step.details) {
          description = step.details;
        } else {
          // Generate a placeholder description based on the title
          description = `This step covers key concepts related to ${title}`;
        }
        
        const estimatedTime = step.estimated_time || step['estimated-time'] || step.estimatedTime || 'Unknown';
        
        return {
          id: step.id || `node-${index}`,
          title: title,
          description: description,
          estimated_time: estimatedTime
        };
      });
      
      console.log('Processed roadmap data:', processedData);
      
      try {
        setRoadmap(processedData);
      } catch (err) {
        console.error('Failed to set roadmap state:', err, processedData);
        alert('Unexpected error while updating roadmap. See console for details.');
      }
    } catch (error) {
      console.error("API error", error);
    } finally {
      setLoading(false);
      // Enable connection mode by default when roadmap is generated
      setConnectionMode(true); 
      setShowConnectionHint(true);
    }
  }, [topic, setNodes, setEdges, showTemporaryMessage]);
  
  // Transform roadmap data into nodes and edges for React Flow
  useEffect(() => {
    if (!roadmap.length) {
      // Clear stored positions when roadmap is cleared
      initialNodePositions.current.clear();
      return;
    }
    
    // Log roadmap data to debug
    console.log('Roadmap data:', roadmap);
    
    // Find maximum id to set nextNodeId
    const maxIdStr = roadmap.reduce((max, step) => {
      const id = typeof step.id === 'string' ? step.id : step.id.toString();
      return id > max ? id : max;
    }, '0');
    
    const maxId = parseInt(maxIdStr, 10);
    if (!isNaN(maxId) && maxId >= nextNodeId.current) {
      nextNodeId.current = maxId + 1;
    }
    
    // Create nodes with all handlers pre-bound
    let flowNodes = [];
    try {
      flowNodes = roadmap.map((step, index) => {
      // Ensure we have a valid ID (convert to string if numeric)
      const nodeId = typeof step.id === 'undefined' ? `node-${index}` : step.id.toString();
      
      // Extract and sanitize description
      let description = '';
      if (typeof step.description === 'string') {
        description = step.description.trim();
      } else if (step.description) {
        description = JSON.stringify(step.description);
      }
      
      // Force a default description if empty or undefined
      if (!description) {
        description = `Details for ${step.title || 'this step'}`;
      }
      
      console.log(`Creating node ${nodeId}:`, {
        title: step.title,
        description: description,
        estimated_time: step.estimated_time
      });
      
      // Use existing position if node was already created and moved
      let position;
      if (initialNodePositions.current.has(nodeId)) {
        position = initialNodePositions.current.get(nodeId);
      } else {
        // Position nodes in a tree structure
        const row = Math.floor(index / 3);
        const col = index % 3;
        position = { 
          x: col * (nodeWidth + 100) + 50, 
          y: row * (nodeHeight + 100) + 50 
        };
        // Store the initial position
        initialNodePositions.current.set(nodeId, { ...position });
      }
      
      return {
        id: nodeId,
        type: 'roadmapNode',
        position: position,
        data: { 
          title: step.title || 'Untitled Step',
          description: description || 'No description available',
          estimated_time: step.estimated_time || 'Unknown',
          onEdit: handleEditNode,
          onDelete: handleDeleteNode
        }
      };
    });

    } catch (mapErr) {
      console.error('Error while mapping roadmap to nodes:', mapErr, roadmap);
      return; // don't attempt to set nodes/edges if mapping failed
    }

    // Create edges connecting the nodes
    const flowEdges = [];
    for (let i = 1; i < roadmap.length; i++) {
      // Connect based on index for a simple tree
      const sourceIdx = Math.floor((i - 1) / 2);
      
      // Ensure both nodes have valid IDs
      const sourceId = typeof roadmap[sourceIdx].id === 'undefined' ? 
                       `node-${sourceIdx}` : roadmap[sourceIdx].id.toString();
      const targetId = typeof roadmap[i].id === 'undefined' ? 
                       `node-${i}` : roadmap[i].id.toString();
      
      console.log(`Creating edge from ${sourceId} to ${targetId}`);
      
      flowEdges.push({
        id: `e${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        sourceHandle: `source-${sourceId}`,
        targetHandle: `target-${targetId}`,
        markerEnd: { type: MarkerType.ArrowClosed },
        type: 'custom',
        animated: true,
        style: { stroke: 'var(--accent)', strokeWidth: 2 },
        data: {
          deletable: true,
          sourceTitle: roadmap[sourceIdx].title,
          targetTitle: roadmap[i].title,
          onDelete: (edgeId) => {
            setEdges((current) => current.filter((ed) => ed.id !== edgeId));
          }
        },
        label: '',
        labelStyle: { fill: 'var(--muted)', fontSize: 12 },
        labelShowBg: false
      });
    }

    // Helper: strip function properties from objects (so function identity doesn't trigger updates)
    const stripFunctions = (obj) => {
      if (Array.isArray(obj)) return obj.map(stripFunctions);
      if (obj && typeof obj === 'object') {
        const res = {};
        for (const key of Object.keys(obj)) {
          const val = obj[key];
          if (typeof val === 'function') continue;
          res[key] = stripFunctions(val);
        }
        return res;
      }
      return obj;
    };

    setNodes(prev => {
      try {
        const prevStr = JSON.stringify(stripFunctions(prev));
        const nextStr = JSON.stringify(stripFunctions(flowNodes));
        if (prevStr === nextStr) return prev;
      } catch (e) {
        // fallback: continue to update
      }
      return flowNodes;
    });

    setEdges(prev => {
      try {
        const prevStr = JSON.stringify(stripFunctions(prev));
        const nextStr = JSON.stringify(stripFunctions(flowEdges));
        if (prevStr === nextStr) return prev;
      } catch (e) {
        // ignore
      }
      return flowEdges;
    });
  }, [roadmap, setNodes, setEdges]);

  // Handler for when the flow is loaded
  const onInit = useCallback((reactFlowInstance) => {
    reactFlowInstance.fitView();
  }, []);

  // Handle adding a new node
  const handleAddNode = useCallback(() => {
    setSelectedNode(null);
    setIsAddingNode(true);
  }, []);

  // Save roadmap to backend
  const handleSaveRoadmap = useCallback(async ({ title, active }) => {
    try {
  const baseUrl = import.meta.env.VITE_API_URL;
      
      // Enhance roadmap data with node positions and connections
      const enhancedRoadmap = roadmap.map(item => {
        // Find the corresponding node to get its position
        const matchingNode = nodes.find(node => node.id === item.id.toString());
        
        // Only include position if it has valid x and y coordinates
        let position = undefined;
        if (matchingNode && matchingNode.position) {
          // Ensure position values are numbers
          const x = parseFloat(matchingNode.position.x);
          const y = parseFloat(matchingNode.position.y);
          
          if (!isNaN(x) && !isNaN(y)) {
            position = { x, y };
          }
        }
        
        return {
          ...item,
          position,
        };
      });
      
      // Format edges to ensure they have the correct structure
      const formattedEdges = edges.map(edge => {
        // Keep the original source and target handle IDs if they exist
        // Otherwise, generate node-specific handle IDs
        const sourceHandleId = edge.sourceHandle || `source-${edge.source}`;
        const targetHandleId = edge.targetHandle || `target-${edge.target}`;
        
        const formattedEdge = {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type || 'custom',
          sourceHandle: sourceHandleId,
          targetHandle: targetHandleId
        };
        
        return formattedEdge;
      });
      
      // Include the edges/connections data
      const body = { 
        title, 
        active, 
        roadmap: enhancedRoadmap,
        edges: formattedEdges
      };
      
      console.log('Saving roadmap with data:', {
        title,
        active,
        nodes: nodes.length,
        edges: edges.length,
        enhancedRoadmap,
        formattedEdges
      });
      
      const res = await fetch(`${baseUrl}/api/roadmaps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        console.error('Save failed', err);
        showTemporaryMessage('Save failed: ' + (err.error || res.statusText), 'error');
        return;
      }
      const saved = await res.json();
      setShowSaveDialog(false);
      showTemporaryMessage('Roadmap saved successfully!', 'success');
      
      // Clear the roadmap state first to prevent beforeunload from triggering
      setRoadmap([]);
      setNodes([]);
      setEdges([]);
      
      // Set flag to indicate intentional reload (programmatic, not user-initiated)
      sessionStorage.setItem('intentionalReload', 'true');
      
      // Wait a brief moment for the success message to be visible and state to clear
      setTimeout(() => {
        // Reload the page to reset the state
        window.location.reload();
      }, 1000);
      
    } catch (err) {
      console.error('Save error', err);
      showTemporaryMessage('Save error', 'error');
    }
  }, [roadmap, nodes, edges, setRoadmap, setNodes, setEdges]);

  const handleSaveNode = useCallback((nodeData) => {
    if (isAddingNode) {
      // Create a new node ID
      const newNodeId = `new-${nextNodeId.current}`;
      nextNodeId.current += 1;
      
      // Create new roadmap step
      const newStep = {
        id: newNodeId,
        title: nodeData.title,
        description: nodeData.description,
        estimated_time: nodeData.estimated_time,
      };
      
      // Create new node
      const lastNode = nodes.length > 0 ? nodes[nodes.length - 1] : null;
      const newNodeX = lastNode ? lastNode.position.x + 300 : 100;
      const newNodeY = lastNode ? lastNode.position.y : 100;
      
      // First update roadmap
      const updatedRoadmap = [...roadmap, newStep];
      setRoadmap(updatedRoadmap);
      
      // Store the position of the new node
      const position = { x: newNodeX, y: newNodeY };
      initialNodePositions.current.set(newNodeId, { ...position });
      
      // Then update nodes
      const newNode = {
        id: newNodeId,
        type: 'roadmapNode',
        position: position,
        data: { 
          title: nodeData.title,
          description: nodeData.description,
          estimated_time: nodeData.estimated_time,
          onEdit: handleEditNode,
          onDelete: handleDeleteNode
        }
      };
      
      setNodes(prev => [...prev, newNode]);
      
      // Connect to the last node if it exists
      if (lastNode) {
        const newEdge = {
          id: `e${lastNode.id}-${newNodeId}`,
          source: lastNode.id,
          target: newNodeId,
          markerEnd: { type: MarkerType.ArrowClosed },
          type: 'smoothstep',
          animated: true,
        };
        
        setEdges(prev => [...prev, newEdge]);
      }
    } else if (isEditing && selectedNode) {
      // Update roadmap data first
      setRoadmap(prev => prev.map(step => 
        step.id.toString() === selectedNode.id ? 
        { ...step, title: nodeData.title, description: nodeData.description, estimated_time: nodeData.estimated_time } : 
        step
      ));
      
      // Then update node
      setNodes(prev => prev.map(node => 
        node.id === selectedNode.id ? 
        { 
          ...node, 
          data: { 
            ...node.data, 
            title: nodeData.title, 
            description: nodeData.description, 
            estimated_time: nodeData.estimated_time
          } 
        } : 
        node
      ));
    }
    
    // Close editor
    setIsEditing(false);
    setIsAddingNode(false);
    setSelectedNode(null);
  }, [isAddingNode, isEditing, selectedNode, nodes, setNodes, setEdges, setRoadmap, handleEditNode, handleDeleteNode, roadmap]);
  
  // Handle canceling node edit/add
  const handleCancelNodeEdit = useCallback(() => {
    setIsEditing(false);
    setIsAddingNode(false);
    setSelectedNode(null);
  }, []);

  // Function to handle navigation with save prompt
  const handleNavigation = useCallback((destination) => {
    // Only prompt if there's a roadmap that hasn't been saved
    if (roadmap.length > 0) {
      // Store the destination and show custom confirm dialog
      setPendingDestination(destination);
      setShowConfirmDialog(true);
      return; // Don't navigate yet
    }
    
    // If no roadmap, navigate directly
    navigate(destination);
  }, [roadmap, navigate]);
  
  // Handler for confirm dialog "Save" button
  const handleConfirmSave = useCallback(() => {
    setShowConfirmDialog(false);
    // Show the save dialog with the topic as the default title
    setTitle(topic); // Pre-fill title with current topic
    setShowSaveDialog(true);
    // We'll use pendingDestination state instead of sessionStorage
  }, [topic]);
  
  // Handler for confirm dialog "Cancel" button
  const handleConfirmCancel = useCallback(() => {
    setShowConfirmDialog(false);
    // Stay on the page, don't navigate
    setPendingDestination(null);
  }, []);
  
  const viewSavedRoadmaps = () => {
    handleNavigation('/saved');
  };
  
  // Add a keydown handler to detect F5 or Ctrl+R for reload
  useEffect(() => {
    const handleKeyDown = (e) => {
      // F5 key or Ctrl+R for refresh
      if ((e.key === 'F5' || (e.ctrlKey && e.key === 'r')) && roadmap.length > 0) {
        e.preventDefault();
        setShowReloadDialog(true);
        return false;
      }
    };
    
    // Use capture phase to try to intercept before browser handling
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [roadmap]);
  
  // We still need a fallback handler for beforeunload (browser refresh button)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (roadmap.length > 0) {
        // This is required by browsers but won't be shown with our custom dialog
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [roadmap]);
  
  // Handlers for reload confirmation dialog
  const handleReloadConfirm = useCallback(() => {
    // Remove the beforeunload listener temporarily so it doesn't trigger during reload
    const noop = () => {};
    window.addEventListener('beforeunload', noop);
    
    // Set a flag in sessionStorage to indicate intentional reload
    sessionStorage.setItem('intentionalReload', 'true');
    
    // Immediately reload
    window.location.reload();
  }, []);
  
  const handleReloadCancel = useCallback(() => {
    setShowReloadDialog(false);
  }, []);

  // Add state for the title field
  const [title, setTitle] = useState("");

  return (
    <div className="page generator-page">
      <header className="app-header">
        <div className="logo">
          <span className="logo-text">Roadmap Generator</span>
        </div>
        <nav>

        </nav>
      </header>
      
      <div className="page-content">
        <div className="input-container">
          <input
            className="topic-input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter a learning goal or project topic..."
            disabled={loading}
          />
          <button
            className="generate-btn primary-btn"
            onClick={() => generateRoadmap()}
            disabled={loading || !topic.trim()}
          >
            {loading ? "Generating..." : "Generate Roadmap"}
          </button>
        </div>

        {/* No longer need this section as we'll show requests above the flow container */}

        {/* Roadmap requests button and toggle */}
        {requests.length > 0 && (
          <div>
            {/* Button to toggle requests visibility */}
            <button
              onClick={() => setShowRequests(!showRequests)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '15px',
                backgroundColor: showRequests ? '#1d4ed8' : '#e2e8f0', 
                color: showRequests ? 'white' : '#000000',
                border: '2px solid ' + (showRequests ? '#1e40af' : '#cbd5e1'),
                padding: '10px 16px',
                borderRadius: 'var(--radius)',
                fontWeight: 700,
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'var(--transition)'
              }}
            >
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path 
                    d="M8 3V8M8 8V13M8 8H13M8 8H3" 
                    stroke={showRequests ? "white" : "#1e293b"} 
                    strokeWidth="2" 
                    strokeLinecap="round"
                    transform={showRequests ? "rotate(45, 8, 8)" : ""}
                  />
                </svg>
                <span style={{ 
                  color: showRequests ? 'white' : '#000000',
                  textShadow: showRequests ? '0 1px 2px rgba(0,0,0,0.2)' : 'none'
                }}>
                  {showRequests ? 'Hide' : 'Show'} Requested Roadmaps
                </span>
              </div>
              <span style={{ 
                fontSize: '12px', 
                background: showRequests ? 'white' : 'var(--accent)', 
                color: showRequests ? 'var(--accent)' : 'white', 
                padding: '3px 8px', 
                borderRadius: '12px',
                fontWeight: 700,
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>
                {requests.length}
              </span>
            </button>

            {/* Requests content - only visible when showRequests is true */}
            {showRequests && (
              <div className="flow-sidebar" style={{ 
                marginBottom: '15px',
                backgroundColor: 'var(--panel)',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow)',
                padding: '12px',
                border: '1px solid var(--border)',
                animation: 'fadeIn 0.3s ease-in-out'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ 
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--accent)'
                  }}>Requested Roadmaps</h4>
                </div>
                <div style={{ 
                  display: 'flex',
                  overflowX: 'auto',
                  gap: '10px',
                  marginTop: '10px',
                  paddingBottom: '5px'
                }}>
                  {requests.slice(0, 5).map(r => (
                    <div key={r.id} style={{ 
                      padding: '12px', 
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'white',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.08)',
                      transition: 'var(--transition)',
                      minWidth: '200px',
                      flex: '0 0 auto'
                    }}>
                      <div style={{ 
                        fontWeight: 700, 
                        fontSize: '15px', 
                        color: '#000000', 
                        marginBottom: '8px'
                      }}>{r.title}</div>
                      <div style={{ 
                        fontSize: '12px', 
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: '6px',
                        background: 'rgba(240, 240, 240, 0.5)',
                        padding: '4px 8px',
                        borderRadius: '4px'
                      }}>
                        <span style={{ 
                          fontWeight: 700, 
                          color: '#1d4ed8', /* Darker blue for better contrast */
                          background: 'rgba(37, 99, 235, 0.15)', 
                          padding: '3px 8px',
                          borderRadius: '4px',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                          border: '1px solid rgba(37, 99, 235, 0.2)'
                        }}>{r.status}</span>
                        <span style={{ 
                          fontWeight: 600,
                          color: '#111827', /* Almost black for maximum readability */
                          background: 'rgba(229, 231, 235, 0.5)',
                          padding: '3px 8px',
                          borderRadius: '4px'
                        }}>{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      <button 
                        onClick={() => {
                          generateRoadmap(r.title);
                          setTopic(r.title);
                          
                          // Update request status to completed
                          const baseUrl = import.meta.env.VITE_API_URL;
                          fetch(`${baseUrl}/api/requests/${r.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'completed' })
                          })
                          .then(response => {
                            if (response.ok) {
                              // Remove the completed request from the list
                              setRequests(prev => prev.filter(req => req.id !== r.id));
                              showTemporaryMessage(`Generating roadmap for "${r.title}"`);
                            } else {
                              console.error('Failed to update request status');
                            }
                          })
                          .catch(error => console.error('Error updating request:', error));
                          
                          setShowRequests(false);
                        }}
                        style={{
                          display: 'block',
                          width: '100%',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          marginTop: '8px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          fontSize: '13px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s'
                        }}
                      >
                        Generate Roadmap
                      </button>
                    </div>
                  ))}
                  {requests.length > 5 && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      color: 'var(--accent)', 
                      fontSize: '14px',
                      fontWeight: 500,
                      paddingLeft: '5px'
                    }}>
                      +{requests.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {roadmap.length === 0 && !loading && (
          <div className="empty-state">
            <div className="empty-icon">🗺️</div>
            <h2>Create Your Learning Roadmap</h2>
            <p>Enter a topic above and click "Generate Roadmap" to get started.</p>
            <p>Examples: "Machine Learning", "Web Development", "Product Management"</p>
          </div>
        )}

        {loading && (
          <div className="loading-state">
            <div className="loader"></div>
            <p style={{ color: '#111827', fontSize: '16px', fontWeight: '500' }}>
              Generating your personalized roadmap...
            </p>
          </div>
        )}

        {roadmap.length > 0 && (
          <div className="flow-container">
            <ErrorBoundary>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={nodePositionChangeHandler}
                onEdgesChange={onEdgesChange}
                onConnect={handleConnect}
                onEdgeClick={handleEdgeClick}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onInit={onInit}
                fitView
                nodesDraggable={true}
                elementsSelectable={true}
                nodesConnectable={true}
                connectOnClick={true}
                connectionMode="loose"
                deleteKeyCode={['Backspace', 'Delete']}
                panOnScroll={true}
                panOnDrag={true}
                zoomOnScroll={true}
                snapToGrid={true}
                snapGrid={[20, 20]}
                connectionLineStyle={{ stroke: 'var(--accent)', strokeWidth: 3 }}
                connectionLineComponent={CustomConnectionLine}
                defaultEdgeOptions={{
                  type: 'custom',
                  animated: true,
                  style: { stroke: 'var(--accent)', strokeWidth: 2 },
                  markerEnd: { type: MarkerType.ArrowClosed },
                  deletable: true
                }}
              >
                <Panel position="top-right">
                  <div className="panel-buttons">
                    <button className="add-node-btn" onClick={handleAddNode}>
                      Add Node
                    </button>
                    <button className="save-roadmap-btn" onClick={() => setShowSaveDialog(true)}>
                      Save Roadmap
                    </button>
                  </div>
                </Panel>
                {showConnectionHint && roadmap.length > 0 && (
                  <Panel position="bottom-center">
                    <div className="connection-hint">
                      <button 
                        className="close-btn" 
                        onClick={() => setShowConnectionHint(false)}
                        title="Close hint"
                      >
                        ×
                      </button>
                      <div><strong>Connection Instructions</strong></div>
                      <div><strong>Connect:</strong> Drag from the bottom handle of one node to the top handle of another</div>
                      <div><strong>Delete connection:</strong> Click on any connection line</div>
                      <div><strong>Tip:</strong> Press Escape to dismiss this message</div>
                    </div>
                  </Panel>
                )}
                <Controls />
                <MiniMap />
                <Background color="#aaa" gap={16} />
              </ReactFlow>
            </ErrorBoundary>
          </div>
        )}
          
        {/* JSON preview and debug checkbox removed per request */}
      </div>
      
      {(isEditing || isAddingNode) && (
        <NodeEditor 
          node={isEditing ? selectedNode : null}
          onSave={handleSaveNode}
          onCancel={handleCancelNodeEdit}
        />
      )}
      
      <SaveDialog 
        open={showSaveDialog} 
        onClose={() => setShowSaveDialog(false)} 
        onSave={handleSaveRoadmap}
        defaultTitle={title} 
      />
      
      <ConfirmDialog
        open={showConfirmDialog}
        title="Save Your Roadmap"
        message="Do you want to save this roadmap before leaving? Your progress and changes will be lost if you don't save."
        onConfirm={handleConfirmSave}
        onCancel={handleConfirmCancel}
      />
      
      <ConfirmDialog
        open={showReloadDialog}
        type="reload"
        title="Reload Site"
        message="Changes that you made may not be saved."
        confirmText="Reload"
        cancelText="Cancel"
        onConfirm={handleReloadConfirm}
        onCancel={handleReloadCancel}
      />
    </div>
  );
}

export default GeneratorPage;