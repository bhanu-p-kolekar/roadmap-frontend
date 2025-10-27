import React from 'react';
import './RoadmapList.css';

const RoadmapList = ({ lists = [] }) => {
  if (!lists.length) return <div className="roadmap-list-empty">No saved roadmaps</div>;

  const active = lists.filter(l => l.active);
  const inactive = lists.filter(l => !l.active);

  return (
    <div className="roadmap-list">
      {active.length > 0 && (
        <div className="roadmap-section">
          <h3>Active Roadmaps</h3>
          <ul>
            {active.map(item => (
              <li key={item.id} className="roadmap-item active">
                <div className="roadmap-item-title">{item.title}</div>
                <div className="roadmap-item-meta">Saved: {new Date(item.created_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="roadmap-section">
        <h3>All Roadmaps</h3>
        <ul>
          {lists.map(item => (
            <li key={item.id} className={`roadmap-item ${item.active ? 'active' : ''}`}>
              <div className="roadmap-item-title">{item.title}</div>
              <div className="roadmap-item-meta">Saved: {new Date(item.created_at).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default RoadmapList;
