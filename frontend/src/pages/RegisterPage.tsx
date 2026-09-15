import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { registrationApi } from '../services/api';
import { Building2, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

type Step = 'loading' | 'company' | 'admin' | 'review' | 'success' | 'error';

export default function RegisterPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    CompanyName: '', LegalName: '', ContactPerson: '', ContactEmail: '', ContactMobile: '',
    Address: '', City: '', State: '', Country: 'India', PINCode: '',
    GSTIN: '', PAN: '', Website: '', Industry: '', CompanyType: 'Subsidiary',
    NumBranches: 1, NumUsers: 10, RequestedModules: '["Tasks","ImportantDates","Calendar","Reports"]',
    AdminName: '', AdminEmail: '', AdminUsername: '', Password: '', ConfirmPassword: '',
  });

  useEffect(() => {
    if (!token) { setStep('error'); setErrorMsg('Invalid registration link.'); return; }
    registrationApi.validateToken(token).then(data => {
      if (data.valid) {
        setStep('company');
      } else {
        setStep('error');
        setErrorMsg(data.message || 'This registration link is invalid or has expired.');
      }
    }).catch(err => {
      setStep('error');
      setErrorMsg(err.response?.data?.error || 'Failed to validate registration link.');
    });
  }, [token]);

  const updateForm = (field: string, value: string | number) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  const validateCompanyStep = () => {
    if (!form.CompanyName || !form.ContactPerson || !form.ContactEmail) {
      alert('Please fill in Company Name, Contact Person, and Contact Email.');
      return false;
    }
    return true;
  };

  const validateAdminStep = () => {
    if (!form.AdminName || !form.AdminEmail || !form.AdminUsername || !form.Password) {
      alert('Please fill in all admin account fields.');
      return false;
    }
    if (form.Password.length < 8) {
      alert('Password must be at least 8 characters.');
      return false;
    }
    if (form.Password !== form.ConfirmPassword) {
      alert('Passwords do not match.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const submitData = {
        companyName: form.CompanyName, legalName: form.LegalName,
        contactPerson: form.ContactPerson, contactEmail: form.ContactEmail,
        contactMobile: form.ContactMobile, address: form.Address,
        city: form.City, state: form.State, country: form.Country,
        pinCode: form.PINCode, gstin: form.GSTIN, pan: form.PAN,
        website: form.Website, industry: form.Industry,
        companyType: form.CompanyType, numBranches: form.NumBranches,
        numUsers: form.NumUsers, requestedModules: form.RequestedModules,
        adminName: form.AdminName, adminEmail: form.AdminEmail,
        adminUsername: form.AdminUsername, password: form.Password,
      };
      await registrationApi.submitRegistration(token, submitData);
      setStep('success');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Validating your registration link...</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Registration Link Invalid</h1>
          <p className="text-gray-600 mb-6">{errorMsg}</p>
          <button onClick={() => navigate('/login')} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Go to Login</button>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Registration Submitted!</h1>
          <p className="text-gray-600 mb-6">Your registration has been submitted for review. You will receive an email notification once your account is approved.</p>
          <button onClick={() => navigate('/login')} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Go to Login</button>
        </div>
      </div>
    );
  }

  const stepIndicator = (
    <div className="flex items-center justify-center gap-2 mb-8">
      {['Company Info', 'Admin Account', 'Review'].map((label, i) => {
        const stepMap: Step[] = ['company', 'admin', 'review'];
        const currentIdx = stepMap.indexOf(step);
        const isActive = i === currentIdx;
        const isDone = i < currentIdx;
        return (
          <React.Fragment key={label}>
            {i > 0 && <div className={`h-0.5 w-8 ${isDone ? 'bg-blue-600' : 'bg-gray-300'}`} />}
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                isActive ? 'bg-blue-600 text-white' : isDone ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>{isDone ? '✓' : i + 1}</div>
              <span className={`text-sm ${isActive ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>{label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <Building2 size={40} className="text-blue-600 mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-gray-900">Register Your Company</h1>
          <p className="text-sm text-gray-500 mt-1">Complete the form below to set up your organization</p>
        </div>

        {stepIndicator}

        <div className="bg-white rounded-xl shadow-lg p-6">
          {step === 'company' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                  <input value={form.CompanyName} onChange={e => updateForm('CompanyName', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Legal Name</label>
                  <input value={form.LegalName} onChange={e => updateForm('LegalName', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person *</label>
                  <input value={form.ContactPerson} onChange={e => updateForm('ContactPerson', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
                  <input type="email" value={form.ContactEmail} onChange={e => updateForm('ContactEmail', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Mobile</label>
                  <input value={form.ContactMobile} onChange={e => updateForm('ContactMobile', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <input value={form.Industry} onChange={e => updateForm('Industry', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g. Manufacturing, IT, Healthcare" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input value={form.Address} onChange={e => updateForm('Address', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input value={form.City} onChange={e => updateForm('City', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input value={form.State} onChange={e => updateForm('State', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PIN Code</label>
                  <input value={form.PINCode} onChange={e => updateForm('PINCode', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                  <input value={form.GSTIN} onChange={e => updateForm('GSTIN', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PAN</label>
                  <input value={form.PAN} onChange={e => updateForm('PAN', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input value={form.Website} onChange={e => updateForm('Website', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Branches</label>
                  <input type="number" min={1} value={form.NumBranches} onChange={e => updateForm('NumBranches', parseInt(e.target.value) || 1)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Users</label>
                  <input type="number" min={1} value={form.NumUsers} onChange={e => updateForm('NumUsers', parseInt(e.target.value) || 10)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button onClick={() => { if (validateCompanyStep()) setStep('admin'); }} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Next: Admin Account</button>
              </div>
            </div>
          )}

          {step === 'admin' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Account Setup</h2>
              <p className="text-sm text-gray-600 mb-4">Create the primary administrator account for your organization. This user will have full access to manage your company.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input value={form.AdminName} onChange={e => updateForm('AdminName', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" value={form.AdminEmail} onChange={e => updateForm('AdminEmail', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                  <input value={form.AdminUsername} onChange={e => updateForm('AdminUsername', e.target.value.toLowerCase())} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Choose a login username" />
                </div>
                <div></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input type="password" value={form.Password} onChange={e => updateForm('Password', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Minimum 8 characters" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                  <input type="password" value={form.ConfirmPassword} onChange={e => updateForm('ConfirmPassword', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex justify-between pt-4">
                <button onClick={() => setStep('company')} className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Back</button>
                <button onClick={() => { if (validateAdminStep()) setStep('review'); }} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Next: Review</button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Review Your Registration</h2>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="font-medium text-gray-800">Company Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Company:</span> {form.CompanyName}</div>
                  <div><span className="text-gray-500">Contact:</span> {form.ContactPerson}</div>
                  <div><span className="text-gray-500">Email:</span> {form.ContactEmail}</div>
                  <div><span className="text-gray-500">Mobile:</span> {form.ContactMobile || '-'}</div>
                  <div><span className="text-gray-500">Industry:</span> {form.Industry || '-'}</div>
                  <div><span className="text-gray-500">City:</span> {form.City || '-'}</div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="font-medium text-gray-800">Admin Account</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Name:</span> {form.AdminName}</div>
                  <div><span className="text-gray-500">Username:</span> {form.AdminUsername}</div>
                  <div><span className="text-gray-500">Email:</span> {form.AdminEmail}</div>
                </div>
              </div>
              <div className="flex justify-between pt-4">
                <button onClick={() => setStep('admin')} className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Back</button>
                <button onClick={handleSubmit} disabled={submitting} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50">
                  {submitting ? 'Submitting...' : 'Submit Registration'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
