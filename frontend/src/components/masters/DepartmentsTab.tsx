import React, { useState, useEffect } from 'react';
import { Building, Plus } from 'lucide-react';
import { mastersApi } from '../../services/api';
import { Department } from '../../types';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Badge } from '../common/Badge';

export const DepartmentsTab: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [departmentCode, setDepartmentCode] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDepartments = async () => {
    const res = await mastersApi.getDepartments();
    setDepartments(res.data || []);
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentCode.trim() || !departmentName.trim()) return;

    try {
      setIsSubmitting(true);
      await mastersApi.createDepartment({
        departmentCode: departmentCode.trim(),
        departmentName: departmentName.trim(),
      });
      setIsModalOpen(false);
      setDepartmentCode('');
      setDepartmentName('');
      fetchDepartments();
    } catch (err) {
      console.error('Department creation failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Departments & Business Units
          </h3>
          <p className="text-xs text-slate-500">Configure organizational departments for task ownership</p>
        </div>
        <Button size="sm" onClick={() => setIsModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
          Add Department
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => (
          <div
            key={dept.DepartmentID}
            className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-2"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {dept.DepartmentName}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-semibold">{dept.DepartmentCode}</span>
                </div>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="sm" title="Add New Department">
          <form onSubmit={handleCreate} className="space-y-4">
            <Input label="Department Code" placeholder="DEPT-MKT" value={departmentCode} onChange={(e) => setDepartmentCode(e.target.value)} required />
            <Input label="Department Name" placeholder="Marketing & Communications" value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} required />
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Save Department
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
