import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, ShieldAlert, ShieldCheck, UserX, Check, X, User, Settings } from 'lucide-react';

const RoleModal = ({ member, onClose, onUpdate, familyId }) => {
    const [role, setRole] = useState(member.role);
    const [monthlyAllowance, setMonthlyAllowance] = useState(member.monthlyAllowance || 0);
    const [expenseApprovalLimit, setExpenseApprovalLimit] = useState(member.expenseApprovalLimit || 0);
    const [canViewIncome, setCanViewIncome] = useState(member.canViewIncome ?? true);
    const [canViewOtherMembersExpenses, setCanViewOtherMembersExpenses] = useState(member.canViewOtherMembersExpenses ?? true);
    
    const handleSave = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${import.meta.env.VITE_API_BASE_URL}/family/member/${member.user._id}/role`, {
                familyId, role, monthlyAllowance, expenseApprovalLimit, canViewIncome, canViewOtherMembersExpenses
            }, { headers: { Authorization: `Bearer ${token}` } });
            onUpdate();
            onClose();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to update member');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">Edit Member Settings</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
                        <select className="w-full p-2.5 border border-slate-200 rounded-xl" value={role} onChange={(e) => setRole(e.target.value)}>
                            <option value="Co-Admin">Co-Admin</option>
                            <option value="Contributor">Contributor</option>
                            <option value="Expense Member">Expense Member</option>
                            <option value="Viewer">Viewer</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Monthly Allowance</label>
                        <input type="number" className="w-full p-2.5 border border-slate-200 rounded-xl" value={monthlyAllowance} onChange={(e) => setMonthlyAllowance(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Expense Approval Limit</label>
                        <input type="number" className="w-full p-2.5 border border-slate-200 rounded-xl" value={expenseApprovalLimit} onChange={(e) => setExpenseApprovalLimit(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="cvi" checked={canViewIncome} onChange={(e) => setCanViewIncome(e.target.checked)} className="w-4 h-4" />
                        <label htmlFor="cvi" className="text-sm font-semibold text-slate-700">Can View Family Income</label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="cve" checked={canViewOtherMembersExpenses} onChange={(e) => setCanViewOtherMembersExpenses(e.target.checked)} className="w-4 h-4" />
                        <label htmlFor="cve" className="text-sm font-semibold text-slate-700">Can View Others' Expenses</label>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

const FamilyManagement = ({ familyId }) => {
    const [members, setMembers] = useState([]);
    const [familyCode, setFamilyCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedMember, setSelectedMember] = useState(null);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

    const openRoleModal = (member) => {
        setSelectedMember(member);
        setIsRoleModalOpen(true);
    };

    const fetchMembers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/family/members/${familyId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMembers(res.data.data);
            setFamilyCode(res.data.familyCode);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch members');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, [familyId]);

    const handleAction = async (memberId, action) => {
        let endpoint = '';
        let method = 'patch';

        if (action === 'approve') endpoint = `/family/member/${memberId}/approve`;
        else if (action === 'reject') endpoint = `/family/member/${memberId}/reject`;
        else if (action === 'remove') {
            if (!window.confirm('Are you sure you want to completely remove this member?')) return;
            endpoint = `/family/member/${memberId}`;
            method = 'delete';
        }

        try {
            const token = localStorage.getItem('token');
            const url = `${import.meta.env.VITE_API_BASE_URL}${endpoint}`;
            
            if (method === 'patch') {
                await axios.patch(url, { familyId }, { headers: { Authorization: `Bearer ${token}` } });
            } else {
                await axios.delete(url, { headers: { Authorization: `Bearer ${token}` }, data: { familyId } });
            }
            fetchMembers();
        } catch (err) {
            alert(err.response?.data?.message || `Failed to ${action} member`);
        }
    };

    const handleRegenerateCode = async () => {
        if (!window.confirm('Are you sure? Old invite code will no longer work.')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/family/regenerate-code`, { familyId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFamilyCode(res.data.familyCode);
            alert('Invite code regenerated!');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to regenerate code');
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (error) return <div className="text-red-500 bg-red-50 p-4 rounded-xl">{error}</div>;

    const pendingMembers = members.filter(m => m.status === 'Pending');
    const activeMembers = members.filter(m => m.status === 'Approved' || m.role === 'Admin');

    return (
        <div className="space-y-8">
            {isRoleModalOpen && selectedMember && (
                <RoleModal 
                    member={selectedMember} 
                    onClose={() => setIsRoleModalOpen(false)} 
                    onUpdate={fetchMembers}
                    familyId={familyId}
                />
            )}
            <div className="mb-2">
                <h2 className="text-2xl font-bold text-slate-800">Manage Members</h2>
                <p className="text-slate-500 text-sm">Control access to your shared family ledger.</p>
            </div>

            {/* Invite Code Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-indigo-100 font-semibold text-sm uppercase tracking-wider">Family Invite Code</h3>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-3xl font-black tracking-widest font-mono">{familyCode || '------'}</span>
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(familyCode);
                                        alert('Code copied to clipboard!');
                                    }}
                                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                    title="Copy Code"
                                >
                                    <Check size={18} />
                                </button>
                            </div>
                        </div>
                        <button 
                            onClick={handleRegenerateCode}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-colors border border-white/20"
                        >
                            Regenerate Code
                        </button>
                    </div>
                    <p className="text-indigo-100/80 text-xs italic">
                        Share this code with your family members so they can request to join.
                    </p>
                </div>
                {/* Decorative background circle */}
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
            </div>

            {/* Pending Requests */}
            {pendingMembers.length > 0 && (
                <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
                    <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex items-center gap-3">
                        <ShieldAlert className="text-amber-600" size={20} />
                        <h3 className="font-bold text-amber-900">Pending Requests</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {pendingMembers.map((m) => (
                            <div key={m._id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold text-lg">
                                        {m.user?.fullName?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{m.user?.fullName}</p>
                                        <p className="text-sm text-slate-500">{m.user?.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => handleAction(m.user._id, 'reject')}
                                        className="flex items-center gap-2 px-4 py-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl font-semibold transition-colors"
                                    >
                                        <X size={18} /> Reject
                                    </button>
                                    <button 
                                        onClick={() => handleAction(m.user._id, 'approve')}
                                        className="flex items-center gap-2 px-4 py-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl font-semibold transition-colors"
                                    >
                                        <Check size={18} /> Approve
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Members */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                    <ShieldCheck className="text-slate-600" size={20} />
                    <h3 className="font-bold text-slate-800">Active Members</h3>
                </div>
                <div className="divide-y divide-slate-100">
                    {activeMembers.map((m) => (
                        <div key={m._id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-center gap-4">
                                {m.user?.profileImage ? (
                                    <img src={m.user.profileImage} alt={m.user.fullName} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                                ) : (
                                    <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg">
                                        {m.user?.fullName?.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <p className="font-bold text-slate-800 flex items-center gap-2">
                                        {m.user?.fullName}
                                    </p>
                                    <p className="text-sm text-slate-500">{m.user?.email}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 justify-between sm:justify-end">
                                {/* Role Badge */}
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1
                                    ${m.role === 'Admin' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 
                                      m.role === 'Co-Admin' ? 'bg-pink-100 text-pink-700 border border-pink-200' : 
                                      m.role === 'Contributor' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 
                                      m.role === 'Expense Member' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 
                                      'bg-slate-100 text-slate-700 border border-slate-200'}`
                                }>
                                    {m.role === 'Admin' || m.role === 'Co-Admin' ? <Shield size={12} /> : <User size={12} />}
                                    {m.role}
                                </span>

                                {/* Actions */}
                                {m.role !== 'Admin' && (
                                    <>
                                        <button 
                                            onClick={() => openRoleModal(m)}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Edit Settings"
                                        >
                                            <Settings size={20} />
                                        </button>
                                        <button 
                                            onClick={() => handleAction(m.user._id, 'remove')}
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                            title="Remove Member"
                                        >
                                            <UserX size={20} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FamilyManagement;
