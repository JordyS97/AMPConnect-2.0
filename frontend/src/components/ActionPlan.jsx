import React, { useMemo } from 'react';
import { CheckCircle, AlertTriangle, Package } from 'lucide-react';

const ActionPlan = ({ overdueData, inventoryData }) => {
    // Generate actionable items dynamically based on real data
    const actions = useMemo(() => {
        const items = [];

        // 1. Overdue Customers
        if (overdueData && overdueData.length > 0) {
            const highValue = overdueData.filter(c => c.risk_amount > 5000000);
            if (highValue.length > 0) {
                const totalRisk = highValue.reduce((acc, c) => acc + c.risk_amount, 0);
                items.push({
                    priority: 'High',
                    task: `Call ${highValue.length} high-value overdue customers (Rp ${(totalRisk / 1000000).toFixed(1)}M risk)`,
                    color: 'var(--danger)',
                    bg: '#fef2f2',
                    border: '#fee2e2',
                    icon: AlertTriangle
                });
            } else {
                items.push({
                    priority: 'Medium',
                    task: `Follow up with ${overdueData.length} overdue customers`,
                    color: 'var(--warning)',
                    bg: '#fefce8',
                    border: '#fef9c3',
                    icon: CheckCircle
                });
            }
        }

        // 2. Inventory Alerts
        if (inventoryData && inventoryData.length > 0) {
            const urgentStock = inventoryData.filter(i => i.status === 'Urgent');
            if (urgentStock.length > 0) {
                items.push({
                    priority: 'High',
                    task: `Order stock for ${urgentStock.length} urgent items (${urgentStock.map(i => i.part).join(', ').slice(0, 20)}...)`,
                    color: 'var(--danger)',
                    bg: '#fef2f2',
                    border: '#fee2e2',
                    icon: Package
                });
            } else {
                items.push({
                    priority: 'Low',
                    task: `Replenish ${inventoryData.length} low stock items`,
                    color: 'var(--success)',
                    bg: '#f0fdf4',
                    border: '#dcfce7',
                    icon: Package
                });
            }
        }

        if (items.length === 0) {
            items.push({
                priority: 'Low',
                task: 'No urgent actions required today. Great job!',
                color: 'var(--success)',
                bg: '#f0fdf4',
                border: '#dcfce7',
                icon: CheckCircle
            });
        }

        return items.slice(0, 5); // Limit to top 5
    }, [overdueData, inventoryData]);

    return (
        <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>🎬 Recommended Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {actions.map((action, i) => (
                    <div key={i} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        padding: 12,
                        borderRadius: 8,
                        background: action.bg,
                        border: `1px solid ${action.border}`,
                        color: action.color
                    }}>
                        <action.icon size={20} style={{ marginRight: 12, marginTop: 2, flexShrink: 0 }} />
                        <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{action.priority} Priority</span>
                            <p style={{ fontWeight: 500, margin: 0 }}>{action.task}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ActionPlan;
