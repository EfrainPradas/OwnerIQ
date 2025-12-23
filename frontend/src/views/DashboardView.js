import React from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    BarElement,
    Filler,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    BarElement,
    Filler,
);

import { useNavigate } from 'react-router-dom';

const DashboardView = ({ properties }) => {
    const navigate = useNavigate();
    // Calculate portfolio metrics
    const totalValue = properties.reduce((sum, p) => sum + (Number(p.valuation) || 0), 0);
    const totalLoanAmount = properties.reduce((sum, p) => sum + (Number(p.loan_amount) || 0), 0);
    const totalEquity = totalValue - totalLoanAmount;

    const totalMonthlyRent = properties.reduce((sum, p) => sum + (Number(p.rent) || 0), 0);
    const totalAnnualRent = totalMonthlyRent * 12;

    // Calculate monthly expenses
    const totalMonthlyExpenses = properties.reduce((sum, p) => {
        const monthlyTaxes = (Number(p.taxes) || 0) / 12;
        const monthlyInsurance = (Number(p.insurance) || 0) / 12;
        const monthlyHOA = Number(p.hoa) || 0;
        const monthlyMaintenance = (Number(p.maintenance) || 0) / 100 * (Number(p.rent) || 0);
        return sum + monthlyTaxes + monthlyInsurance + monthlyHOA + monthlyMaintenance;
    }, 0);

    const totalAnnualExpenses = totalMonthlyExpenses * 12;

    // Calculate mortgage payments
    const totalMonthlyMortgage = properties.reduce((sum, p) => sum + (Number(p.monthly_payment) || 0), 0);
    // const totalAnnualMortgage = totalMonthlyMortgage * 12;

    // Net operating income (before mortgage)
    const annualNOI = totalAnnualRent - totalAnnualExpenses;
    const monthlyNOI = annualNOI / 12;

    // Cash flow (after mortgage)
    const monthlyCashFlow = totalMonthlyRent - totalMonthlyExpenses - totalMonthlyMortgage;
    const annualCashFlow = monthlyCashFlow * 12;

    // Calculate average metrics
    const avgCapRate = totalValue > 0 ? (annualNOI / totalValue) * 100 : 0;
    const avgOccupancy = properties.length > 0
        ? properties.reduce((sum, p) => sum + (100 - (Number(p.vacancy) || 0)), 0) / properties.length
        : 0;
    const avgLTV = totalValue > 0 ? (totalLoanAmount / totalValue) * 100 : 0;

    return (
        <div className="container">
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
            }}>
                <h1 style={{ margin: 0, fontSize: '28px', color: 'var(--accent-primary)' }}>
                    Dashboard <span style={{ fontSize: '18px', color: 'var(--text-muted)', fontWeight: 'normal' }}>Overview</span>
                </h1>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        className="filter-btn"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'var(--panel-secondary)',
                            boxShadow: 'var(--shadow)',
                            fontWeight: 'bold'
                        }}
                    >
                        <i className="fas fa-calendar"></i> This Month
                    </button>
                    <button
                        className="filter-btn"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'var(--panel-secondary)',
                            boxShadow: 'var(--shadow)',
                            fontWeight: 'bold'
                        }}
                    >
                        <i className="fas fa-filter"></i> Filter
                    </button>
                </div>
            </div>

            <div className="grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '20px',
                marginBottom: '30px'
            }}>
                {[
                    {
                        title: 'Portfolio Value',
                        value: `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
                        subtitle: `${properties.length} ${properties.length === 1 ? 'property' : 'properties'}`,
                        icon: 'fas fa-building',
                        iconClass: 'icon-primary',
                        metric: avgCapRate > 0 ? `${avgCapRate.toFixed(2)}% Cap Rate` : null
                    },
                    {
                        title: 'Total Equity',
                        value: `$${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
                        subtitle: `${avgLTV.toFixed(1)}% LTV`,
                        icon: 'fas fa-chart-pie',
                        iconClass: 'icon-success',
                        metric: totalLoanAmount > 0 ? `$${totalLoanAmount.toLocaleString()} debt` : 'No debt'
                    },
                    {
                        title: 'Monthly Income',
                        value: `$${totalMonthlyRent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
                        subtitle: `$${totalAnnualRent.toLocaleString()}/year`,
                        icon: 'fas fa-hand-holding-usd',
                        iconClass: 'icon-success',
                        metric: `${avgOccupancy.toFixed(1)}% occupancy`
                    },
                    {
                        title: 'Operating Expenses',
                        value: `$${totalMonthlyExpenses.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
                        subtitle: `$${totalAnnualExpenses.toLocaleString()}/year`,
                        icon: 'fas fa-receipt',
                        iconClass: 'icon-warning',
                        metric: totalMonthlyRent > 0 ? `${((totalMonthlyExpenses / totalMonthlyRent) * 100).toFixed(1)}% of rent` : null
                    },
                    {
                        title: 'Net Operating Income',
                        value: `${monthlyNOI >= 0 ? '+' : ''}$${Math.abs(monthlyNOI).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
                        subtitle: `${annualNOI >= 0 ? '+' : ''}$${Math.abs(annualNOI).toLocaleString()}/year`,
                        icon: 'fas fa-chart-line',
                        iconClass: monthlyNOI >= 0 ? 'icon-success' : 'icon-error',
                        metric: 'Before debt service'
                    },
                    {
                        title: 'Monthly Cash Flow',
                        value: `${monthlyCashFlow >= 0 ? '+' : ''}$${Math.abs(monthlyCashFlow).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
                        subtitle: `${annualCashFlow >= 0 ? '+' : ''}$${Math.abs(annualCashFlow).toLocaleString()}/year`,
                        icon: 'fas fa-coins',
                        iconClass: monthlyCashFlow >= 0 ? 'icon-success' : 'icon-error',
                        metric: totalMonthlyMortgage > 0 ? `$${totalMonthlyMortgage.toLocaleString()} debt service` : 'No debt service'
                    }
                ].map((kpi, i) => (
                    <div key={i} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '5px',
                                height: '100%',
                                background: kpi.iconClass === 'icon-success' ? 'var(--success)' :
                                    kpi.iconClass === 'icon-warning' ? 'var(--warning)' :
                                        kpi.iconClass === 'icon-error' ? 'var(--error)' : 'var(--accent-primary)'
                            }}
                        />
                        <div className="card-header">
                            <div className="card-title-group">
                                <div className={`card-icon ${kpi.iconClass}`}><i className={kpi.icon}></i></div>
                                <div className="card-title">{kpi.title}</div>
                            </div>
                        </div>
                        <div className="metric" style={{ marginBottom: '8px' }}>{kpi.value}</div>
                        {kpi.subtitle && (
                            <div style={{
                                fontSize: '13px',
                                color: 'var(--text-muted)',
                                fontWeight: 600,
                                marginBottom: '6px'
                            }}>
                                {kpi.subtitle}
                            </div>
                        )}
                        {kpi.metric && (
                            <div style={{
                                fontSize: '12px',
                                color: 'var(--text-secondary)',
                                background: 'rgba(100, 116, 139, 0.1)',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                display: 'inline-block'
                            }}>
                                {kpi.metric}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {properties.length > 0 ? (
                <div className="grid grid-3">
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title-group">
                                <div className="card-icon icon-success"><i className="fas fa-chart-line"></i></div>
                                <div className="card-title">Property Values</div>
                            </div>
                            <div className="filter-btn">
                                <i className="fas fa-ellipsis-v"></i>
                            </div>
                        </div>
                        <div className="chart-container">
                            <Bar data={{
                                labels: properties.map(p => p.address || `Property ${properties.indexOf(p) + 1}`),
                                datasets: [{
                                    label: 'Value ($)',
                                    data: properties.map(p => p.valuation || 0),
                                    backgroundColor: '#22C55E',
                                    borderRadius: 6
                                }]
                            }} options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        display: false
                                    }
                                },
                                scales: {
                                    y: {
                                        grid: {
                                            color: 'rgba(255, 255, 255, 0.1)',
                                        }
                                    },
                                    x: {
                                        grid: {
                                            display: false
                                        }
                                    }
                                }
                            }} />
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title-group">
                                <div className="card-icon icon-primary"><i className="fas fa-chart-pie"></i></div>
                                <div className="card-title">Rent Distribution</div>
                            </div>
                            <div className="filter-btn">
                                <i className="fas fa-ellipsis-v"></i>
                            </div>
                        </div>
                        <div className="chart-container">
                            <Doughnut data={{
                                labels: properties.map(p => p.address || `Property ${properties.indexOf(p) + 1}`),
                                datasets: [{
                                    data: properties.map(p => p.rent || 0),
                                    backgroundColor: ['#6C8AFF', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'],
                                    borderWidth: 0,
                                    borderRadius: 6
                                }]
                            }} options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                cutout: '70%',
                                plugins: {
                                    legend: {
                                        position: 'bottom',
                                        labels: {
                                            boxWidth: 12,
                                            padding: 15
                                        }
                                    }
                                }
                            }} />
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title-group">
                                <div className="card-icon icon-warning"><i className="fas fa-coins"></i></div>
                                <div className="card-title">Monthly Cash Flow per Property</div>
                            </div>
                            <div className="filter-btn">
                                <i className="fas fa-ellipsis-v"></i>
                            </div>
                        </div>
                        <div className="chart-container">
                            <Bar data={{
                                labels: properties.map(p => {
                                    const address = p.address || `Property ${properties.indexOf(p) + 1}`;
                                    return address.length > 25 ? address.substring(0, 22) + '...' : address;
                                }),
                                datasets: [{
                                    label: 'Monthly Cash Flow ($)',
                                    data: properties.map(p => {
                                        const monthlyRent = Number(p.rent) || 0;
                                        const monthlyTaxes = (Number(p.taxes) || 0) / 12;
                                        const monthlyInsurance = (Number(p.insurance) || 0) / 12;
                                        const monthlyHOA = Number(p.hoa) || 0;
                                        const monthlyMaintenance = (Number(p.maintenance) || 0) / 100 * monthlyRent;
                                        const monthlyMortgage = Number(p.monthly_payment) || 0;
                                        const monthlyExpenses = monthlyTaxes + monthlyInsurance + monthlyHOA + monthlyMaintenance;
                                        return monthlyRent - monthlyExpenses - monthlyMortgage;
                                    }),
                                    backgroundColor: properties.map(p => {
                                        const monthlyRent = Number(p.rent) || 0;
                                        const monthlyTaxes = (Number(p.taxes) || 0) / 12;
                                        const monthlyInsurance = (Number(p.insurance) || 0) / 12;
                                        const monthlyHOA = Number(p.hoa) || 0;
                                        const monthlyMaintenance = (Number(p.maintenance) || 0) / 100 * monthlyRent;
                                        const monthlyMortgage = Number(p.monthly_payment) || 0;
                                        const monthlyExpenses = monthlyTaxes + monthlyInsurance + monthlyHOA + monthlyMaintenance;
                                        const cashFlow = monthlyRent - monthlyExpenses - monthlyMortgage;
                                        return cashFlow >= 0 ? '#22C55E' : '#EF4444';
                                    }),
                                    borderRadius: 6
                                }]
                            }} options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        display: false
                                    },
                                    tooltip: {
                                        callbacks: {
                                            label: function (context) {
                                                let label = context.dataset.label || '';
                                                if (label) {
                                                    label += ': ';
                                                }
                                                if (context.parsed.y !== null) {
                                                    label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(context.parsed.y);
                                                }
                                                return label;
                                            }
                                        }
                                    }
                                },
                                scales: {
                                    y: {
                                        grid: {
                                            color: 'rgba(255, 255, 255, 0.1)',
                                        },
                                        ticks: {
                                            callback: function (value) {
                                                return '$' + value.toLocaleString();
                                            }
                                        }
                                    },
                                    x: {
                                        grid: {
                                            display: false
                                        }
                                    }
                                }
                            }} />
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    background: 'var(--panel-secondary)',
                    borderRadius: 'var(--border-radius)',
                    marginTop: '30px'
                }}>
                    <div style={{ fontSize: '48px', color: 'var(--text-muted)', marginBottom: '15px' }}>
                        <i className="fas fa-home"></i>
                    </div>
                    <h2 style={{ marginBottom: '10px', color: 'var(--text-primary)' }}>No properties found</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
                        Add your first property to start tracking your real estate portfolio
                    </p>
                    <button
                        onClick={() => navigate('/properties')}
                        style={{
                            padding: '12px 20px',
                            background: 'var(--accent-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--border-radius)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <i className="fas fa-plus"></i> Add Your First Property
                    </button>
                </div>
            )}
        </div>
    );
};

export default DashboardView;
