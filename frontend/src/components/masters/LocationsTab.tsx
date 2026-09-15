import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Building } from 'lucide-react';
import { mastersApi } from '../../services/api';
import { Location } from '../../types';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Badge } from '../common/Badge';

export const LocationsTab: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [locationCode, setLocationCode] = useState('');
  const [locationName, setLocationName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLocations = async () => {
    const res = await mastersApi.getLocations();
    setLocations(res.data || []);
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationCode.trim() || !locationName.trim()) return;

    try {
      setIsSubmitting(true);
      await mastersApi.createLocation({
        locationCode: locationCode.trim(),
        locationName: locationName.trim(),
        city: city.trim() || null,
        state: state.trim() || null,
        contactPerson: contactPerson.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
      });
      setIsModalOpen(false);
      setLocationCode('');
      setLocationName('');
      setCity('');
      setState('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      fetchLocations();
    } catch (err) {
      console.error('Location creation failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Company Branch & Operating Locations
          </h3>
          <p className="text-xs text-slate-500">Manage office branches, regional hubs, and facilities</p>
        </div>
        <Button size="sm" onClick={() => setIsModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
          Add Location
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map((loc) => (
          <div
            key={loc.LocationID}
            className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {loc.LocationName}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-semibold">{loc.LocationCode}</span>
                </div>
              </div>
              <Badge variant="success">Active</Badge>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
              <p>📍 {loc.City || 'N/A'}, {loc.State || 'India'}</p>
              {loc.ContactPerson && <p>👤 Contact: {loc.ContactPerson}</p>}
              {loc.Phone && <p>📞 Phone: {loc.Phone}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Add Location Modal */}
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="md" title="Add Branch Location">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Location Code" placeholder="LOC-PUN" value={locationCode} onChange={(e) => setLocationCode(e.target.value)} required />
              <Input label="Location Name" placeholder="Pune Branch Office" value={locationName} onChange={(e) => setLocationName(e.target.value)} required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="City" placeholder="Pune" value={city} onChange={(e) => setCity(e.target.value)} />
              <Input label="State" placeholder="Maharashtra" value={state} onChange={(e) => setState(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Contact Person" placeholder="Branch Manager" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
              <Input label="Phone" placeholder="+91 98..." value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Save Location
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
