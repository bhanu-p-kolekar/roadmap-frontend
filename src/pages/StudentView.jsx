import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactFlow, { Background, Controls, MiniMap, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import ErrorBoundary from '../components/ErrorBoundary';
import SimpleRoadmapNode from '../components/SimpleRoadmapNode';
import SimplifiedCustomEdge from '../components/SimplifiedCustomEdge';
import '../styles/SavedPage.css';
import '../styles/StudentView.css';
import '../styles/ReactFlowFixes.css';

const nodeTypes = { roadmapNode: SimpleRoadmapNode };
const edgeTypes = { custom: SimplifiedCustomEdge };

function StudentView() {
	const navigate = useNavigate();
	const [activeRoadmaps, setActiveRoadmaps] = useState([]);
	const [loading, setLoading] = useState(true);
	const [currentRoadmap, setCurrentRoadmap] = useState(null);
	const [isViewingRoadmap, setIsViewingRoadmap] = useState(false);
	const [nodes, setNodes] = useState([]);
	const [edges, setEdges] = useState([]);
	const [searchQuery, setSearchQuery] = useState('');
	const [showRequestForm, setShowRequestForm] = useState(false);
	const [reqTitle, setReqTitle] = useState('');
	const [reqDescription, setReqDescription] = useState('');
	const [submitting, setSubmitting] = useState(false);

	const fetchRoadmaps = useCallback(async () => {
		setLoading(true);
		try {
			const baseUrl = import.meta.env.VITE_API_URL;
			const response = await fetch(`${baseUrl}/api/roadmaps`);
			const data = await response.json();
			setActiveRoadmaps(Array.isArray(data) ? data.filter(item => item.active) : []);
		} catch (err) {
			console.error('Failed to fetch roadmaps for student view', err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => { 
		fetchRoadmaps();
	}, [fetchRoadmaps]);

	const handleSubmitRequest = async () => {
		if (!reqTitle.trim()) {
			alert('Please enter a title for your request');
			return;
		}
		setSubmitting(true);
		try {
			const baseUrl = import.meta.env.VITE_API_URL;
			const res = await fetch(`${baseUrl}/api/requests`, {
				method: 'POST',
				headers: {'Content-Type':'application/json'},
				body: JSON.stringify({ title: reqTitle.trim(), description: reqDescription.trim() })
			});
			if (res.ok) {
				setReqTitle(''); 
				setReqDescription(''); 
				alert('Request submitted successfully!');
			} else {
				const err = await res.json().catch(() => ({}));
				alert('Failed to submit request: ' + (err.error || res.statusText));
			}
		} catch (err) { 
			console.error('Submit request error', err); 
			alert('Failed to submit request. Please try again.');
		} finally {
			setSubmitting(false);
		}
	};

	const viewRoadmap = useCallback((roadmap) => {
		setCurrentRoadmap(roadmap);
		setIsViewingRoadmap(true);
		let roadmapData = roadmap.data;
		let edgesData = [];
		if (roadmapData && typeof roadmapData === 'object' && !Array.isArray(roadmapData)) {
			edgesData = roadmapData.edges || [];
			roadmapData = roadmapData.roadmap || [];
		}
		if (!Array.isArray(roadmapData) || roadmapData.length === 0) return;
		const nodeWidth = 250;
		const nodeHeight = 150;
		const flowNodes = roadmapData.map((step, index) => ({
			id: step.id.toString(),
			type: 'roadmapNode',
			position: step.position || { x: (index % 3) * (nodeWidth + 100) + 50, y: Math.floor(index / 3) * (nodeHeight + 100) + 50 },
			data: { title: step.title || 'Untitled', description: step.description || '', estimated_time: step.estimated_time || 'Unknown' }
		}));
		const flowEdges = (edgesData && Array.isArray(edgesData) ? edgesData : []).map(e => ({
			id: e.id, source: e.source, target: e.target, type: 'custom', markerEnd: { type: MarkerType.ArrowClosed },
			animated: true, sourceHandle: e.sourceHandle || 'source', targetHandle: e.targetHandle || 'target'
		}));
		setNodes(flowNodes);
		setEdges(flowEdges);
	}, []);

	const closeRoadmapView = () => { setIsViewingRoadmap(false); setCurrentRoadmap(null); setNodes([]); setEdges([]); };

	const filteredActiveRoadmaps = useMemo(() => {
		if (!searchQuery.trim()) return activeRoadmaps;
		const query = searchQuery.toLowerCase();
		return activeRoadmaps.filter(roadmap => 
			roadmap.title.toLowerCase().includes(query) ||
			(roadmap.data && Array.isArray(roadmap.data) && roadmap.data.some(step => 
				step.title?.toLowerCase().includes(query) || step.description?.toLowerCase().includes(query)
			))
		);
	}, [activeRoadmaps, searchQuery]);

	return (
		<div className="page saved-page">
			<header className="app-header">
				<div className="logo"><span className="logo-text">Roadmap Generator</span></div>
				<nav>
					
				</nav>
			</header>
			<div className="page-content">
				{!isViewingRoadmap ? (
					<div className="roadmaps-container">
						<div className="request-form-section">
							<button className="request-toggle-btn" onClick={() => setShowRequestForm(!showRequestForm)}>
								<span className="toggle-icon">{showRequestForm ? '▼' : '▶'}</span>
								<span>Request a Roadmap</span>
							</button>
							{showRequestForm && (
								<div className="request-form-content">
									<div className="form-group">
										<label htmlFor="reqTitle">Roadmap Title *</label>
										<input id="reqTitle" type="text" className="form-input" value={reqTitle}
											onChange={e => setReqTitle(e.target.value)} placeholder="e.g., Full Stack Web Development" disabled={submitting} />
									</div>
									<div className="form-group">
										<label htmlFor="reqDescription">Description (Optional)</label>
										<textarea id="reqDescription" className="form-textarea" value={reqDescription}
											onChange={e => setReqDescription(e.target.value)}
											placeholder="Describe what you'd like to learn or achieve with this roadmap..." rows={4} disabled={submitting} />
									</div>
									<button className="submit-request-btn" onClick={handleSubmitRequest} disabled={submitting || !reqTitle.trim()}>
										{submitting ? 'Submitting...' : 'Submit Request'}
									</button>
								</div>
							)}
						</div>
						<div className="roadmap-section">
							<div className="section-header">
								<h1>Active Roadmaps</h1>
								{activeRoadmaps.length > 0 && (
									<div className="search-bar">
										<input type="text" placeholder="Search roadmaps..." value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
										{searchQuery && (<button className="clear-search" onClick={() => setSearchQuery('')} title="Clear search">✕</button>)}
									</div>
								)}
							</div>
							{loading ? (
								<div className="loading-state"><div className="loader"></div><p>Loading roadmaps...</p></div>
							) : activeRoadmaps.length === 0 ? (
								<div className="empty-state"><div className="empty-icon">📚</div><h2>No Active Roadmaps</h2><p>Check back later for new learning paths!</p></div>
							) : filteredActiveRoadmaps.length === 0 ? (
								<div className="no-results"><p>No roadmaps found matching "{searchQuery}"</p></div>
							) : (
								<div className="roadmap-grid">
									{filteredActiveRoadmaps.map(roadmap => (
										<div key={roadmap.id} className="roadmap-card active">
											<div className="roadmap-card-header"><h3>{roadmap.title}</h3></div>
											<div className="roadmap-card-body">
												<div className="roadmap-meta">Created: {new Date(roadmap.created_at).toLocaleDateString()}</div>
												<div className="roadmap-stats">
													{roadmap.data && Array.isArray(roadmap.data) && `${roadmap.data.length} steps`}
													{roadmap.data && !Array.isArray(roadmap.data) && roadmap.data.roadmap && `${roadmap.data.roadmap.length} steps`}
												</div>
											</div>
											<div className="roadmap-card-footer">
												<button className="view-btn" onClick={() => viewRoadmap(roadmap)}>View Roadmap</button>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				) : (
					<div className="roadmap-viewer">
						<div className="viewer-header">
							<h2>{currentRoadmap?.title}</h2>
							<div className="viewer-actions">
								<button className="back-btn" onClick={closeRoadmapView}>← Back to Roadmaps</button>
							</div>
						</div>
						<div className="flow-container">
							<ErrorBoundary>
								<ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView
									fitViewOptions={{ padding: 0.2 }} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}
									zoomOnScroll={true} panOnScroll={false} panOnDrag={true} attributionPosition="bottom-right">
									<Controls /><MiniMap /><Background color="#aaa" gap={16} />
								</ReactFlow>
							</ErrorBoundary>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

export default StudentView;
