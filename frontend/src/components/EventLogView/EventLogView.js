import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import './EventLogView.css';

const EventLogView = () => {
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        uploads: 0,
        processed: 0,
        errors: 0
    });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({
        category: 'all',
        type: 'all',
        timeRange: '24h'
    });
    const [autoRefresh, setAutoRefresh] = useState(true);

    useEffect(() => {
        loadEvents();

        // Auto-refresh every 10 seconds
        let interval;
        if (autoRefresh) {
            interval = setInterval(loadEvents, 10000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [autoRefresh]);

    useEffect(() => {
        applyFilters();
    }, [events, filter]);

    const loadEvents = async () => {
        try {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            // Calculate time range
            const timeMap = {
                '1h': 1,
                '24h': 24,
                '7d': 168,
                'all': null
            };

            const hoursAgo = timeMap[filter.timeRange];
            const cutoffTime = hoursAgo
                ? new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString()
                : null;

            let query = supabase
                .from('onboarding_event_log')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(100);

            if (cutoffTime) {
                query = query.gte('created_at', cutoffTime);
            }

            const { data, error } = await query;

            if (error) throw error;

            setEvents(data || []);
            calculateStats(data || []);
            setLoading(false);
        } catch (error) {
            console.error('Error loading events:', error);
            setLoading(false);
        }
    };

    const calculateStats = (eventData) => {
        setStats({
            total: eventData.length,
            uploads: eventData.filter(e => e.event_category === 'upload').length,
            processed: eventData.filter(e => e.status === 'processed').length,
            errors: eventData.filter(e => e.event_category === 'error').length
        });
    };

    const applyFilters = () => {
        let filtered = [...events];

        if (filter.category !== 'all') {
            filtered = filtered.filter(e => e.event_category === filter.category);
        }

        if (filter.type !== 'all') {
            filtered = filtered.filter(e => e.event_type === filter.type);
        }

        setFilteredEvents(filtered);
    };

    const getEventIcon = (event) => {
        const iconMap = {
            navigation: '🧭',
            upload: '📤',
            processing: '⚙️',
            completion: '✅',
            error: '❌'
        };
        return iconMap[event.event_category] || '📝';
    };

    const getEventColor = (event) => {
        const colorMap = {
            navigation: '#3b82f6',
            upload: '#8b5cf6',
            processing: '#f59e0b',
            completion: '#10b981',
            error: '#ef4444'
        };
        return colorMap[event.event_category] || '#6b7280';
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    const uniqueEventTypes = [...new Set(events.map(e => e.event_type))];

    if (loading) {
        return (
            <div className="event-log-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading event logs...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="event-log-container">
            {/* Header */}
            <div className="event-log-header">
                <div className="header-content">
                    <h1>📊 Event Log & Analytics</h1>
                    <p>Real-time monitoring of your onboarding workflow</p>
                </div>
                <div className="header-actions">
                    <button
                        className={`refresh-toggle ${autoRefresh ? 'active' : ''}`}
                        onClick={() => setAutoRefresh(!autoRefresh)}
                    >
                        {autoRefresh ? '⏸️ Pause' : '▶️ Resume'} Auto-Refresh
                    </button>
                    <button className="refresh-btn" onClick={loadEvents}>
                        🔄 Refresh Now
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card total">
                    <div className="stat-icon">📝</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Total Events</div>
                    </div>
                </div>

                <div className="stat-card uploads">
                    <div className="stat-icon">📤</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.uploads}</div>
                        <div className="stat-label">Uploads</div>
                    </div>
                </div>

                <div className="stat-card processed">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.processed}</div>
                        <div className="stat-label">Processed</div>
                    </div>
                </div>

                <div className="stat-card errors">
                    <div className="stat-icon">❌</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.errors}</div>
                        <div className="stat-label">Errors</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-section">
                <div className="filter-group">
                    <label>Time Range:</label>
                    <select
                        value={filter.timeRange}
                        onChange={(e) => setFilter({ ...filter, timeRange: e.target.value })}
                    >
                        <option value="1h">Last Hour</option>
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="all">All Time</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label>Category:</label>
                    <select
                        value={filter.category}
                        onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                    >
                        <option value="all">All Categories</option>
                        <option value="navigation">Navigation</option>
                        <option value="upload">Upload</option>
                        <option value="processing">Processing</option>
                        <option value="completion">Completion</option>
                        <option value="error">Errors Only</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label>Event Type:</label>
                    <select
                        value={filter.type}
                        onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                    >
                        <option value="all">All Types</option>
                        {uniqueEventTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Timeline */}
            <div className="timeline-section">
                <h2>📅 Event Timeline</h2>
                {filteredEvents.length === 0 ? (
                    <div className="empty-state">
                        <p>No events found matching your filters</p>
                    </div>
                ) : (
                    <div className="timeline">
                        {filteredEvents.map((event, index) => (
                            <div
                                key={event.event_id}
                                className="timeline-item"
                                style={{ borderLeftColor: getEventColor(event) }}
                            >
                                <div className="timeline-marker" style={{ backgroundColor: getEventColor(event) }}>
                                    {getEventIcon(event)}
                                </div>

                                <div className="timeline-content">
                                    <div className="event-header">
                                        <div className="event-title">
                                            <span className="event-type">{event.event_type}</span>
                                            {event.document_type && (
                                                <span className="event-doc-type">({event.document_type})</span>
                                            )}
                                            {event.status && (
                                                <span className={`event-status status-${event.status}`}>
                                                    {event.status}
                                                </span>
                                            )}
                                        </div>
                                        <div className="event-time">{formatTime(event.created_at)}</div>
                                    </div>

                                    {event.error_message && (
                                        <div className="event-error">
                                            <strong>Error:</strong> {event.error_message}
                                            {event.error_code && <span className="error-code">Code: {event.error_code}</span>}
                                        </div>
                                    )}

                                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                                        <div className="event-metadata">
                                            <details>
                                                <summary>View Metadata</summary>
                                                <pre>{JSON.stringify(event.metadata, null, 2)}</pre>
                                            </details>
                                        </div>
                                    )}

                                    {event.step_number && (
                                        <div className="event-detail">
                                            <span className="detail-label">Step:</span>
                                            <span className="detail-value">{event.step_number}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EventLogView;
