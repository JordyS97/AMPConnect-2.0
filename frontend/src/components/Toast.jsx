import { useState, useEffect, createContext, useContext } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = (message, type = 'info', duration = 4000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    };

    const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="toast-container">
                {toasts.map(toast => {
                    const icons = {
                        success: <CheckCircle size={20} color="var(--success)" />,
                        error: <AlertCircle size={20} color="var(--danger)" />,
                        warning: <AlertTriangle size={20} color="var(--warning)" />,
                        info: <Info size={20} color="var(--primary)" />,
                    };
                    return (
                        <div key={toast.id} className={`toast ${toast.type}`}>
                            {icons[toast.type]}
                            <span className="toast-message">{toast.message}</span>
                            <button className="toast-close" onClick={() => removeToast(toast.id)}>
                                <X size={16} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
};
