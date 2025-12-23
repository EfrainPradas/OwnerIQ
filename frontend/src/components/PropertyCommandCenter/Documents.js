import React from 'react';
import PropertyDocuments from '../PropertyDocuments';
import './PropertyCommandCenter.css';

const Documents = ({ propertyId, onNavigate }) => {
    return (
        <div className="property-command-center documents-view">
            <div className="details-header">
                <div className="header-title">
                    <button className="back-btn" onClick={() => onNavigate('overview')}>
                        ← Back to Overview
                    </button>
                    <h2>Document Center</h2>
                    <p className="header-subtitle">Manage and organize property files</p>
                </div>
            </div>

            <div className="document-center-container">
                <PropertyDocuments propertyId={propertyId} />
            </div>
        </div>
    );
};

export default Documents;
