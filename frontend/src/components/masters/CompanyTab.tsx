import React, { useState, useEffect } from 'react';
import { Building2, Save, Check } from 'lucide-react';
import { mastersApi } from '../../services/api';
import { Company } from '../../types';
import { Input } from '../common/Input';
import { Button } from '../common/Button';

export const CompanyTab: React.FC = () => {
  const [company, setCompany] = useState<Company | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [shortName, setShortName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [financialYear, setFinancialYear] = useState('');
  const [timeZone, setTimeZone] = useState('Asia/Kolkata');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    mastersApi.getCompany().then((res) => {
      if (res.data) {
        setCompany(res.data);
        setCompanyName(res.data.CompanyName || '');
        setShortName(res.data.ShortName || '');
        setAddress(res.data.Address || '');
        setCity(res.data.City || '');
        setState(res.data.State || '');
        setPinCode(res.data.PINCode || '');
        setPhone(res.data.Phone || '');
        setEmail(res.data.Email || '');
        setGstin(res.data.GSTIN || '');
        setPan(res.data.PAN || '');
        setFinancialYear(res.data.FinancialYear || '2026-2027');
        setTimeZone(res.data.TimeZone || 'Asia/Kolkata');
      }
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await mastersApi.updateCompany({
        companyName,
        shortName,
        address,
        city,
        state,
        pinCode,
        phone,
        email,
        gstin,
        pan,
        financialYear,
        timeZone,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update company:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6 max-w-4xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Corporate Profile & Master Settings
            </h3>
            <p className="text-xs text-slate-500">Manage primary company details, tax registration, and defaults</p>
          </div>
        </div>

        <Button type="submit" isLoading={isSaving} icon={savedSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}>
          {savedSuccess ? 'Saved Changes' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Company Legal Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
        <Input label="Display / Short Name" value={shortName} onChange={(e) => setShortName(e.target.value)} required />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input label="Official Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="Financial Year" value={financialYear} onChange={(e) => setFinancialYear(e.target.value)} />
      </div>

      <Input label="Registered Office Address" value={address} onChange={(e) => setAddress(e.target.value)} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <Input label="State" value={state} onChange={(e) => setState(e.target.value)} />
        <Input label="PIN Code" value={pinCode} onChange={(e) => setPinCode(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="GSTIN Identification" value={gstin} onChange={(e) => setGstin(e.target.value)} />
        <Input label="Corporate PAN" value={pan} onChange={(e) => setPan(e.target.value)} />
      </div>
    </form>
  );
};
