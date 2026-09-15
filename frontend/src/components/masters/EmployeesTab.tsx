import React, { useState, useEffect } from 'react';
import { User, Plus, Mail, Phone, Calendar, Building, MapPin } from 'lucide-react';
import { mastersApi } from '../../services/api';
import { Employee, Department, Location, Role } from '../../types';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Badge } from '../common/Badge';

export const EmployeesTab: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employeeCode, setEmployeeCode] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [designation, setDesignation] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [roleId, setRoleId] = useState('5'); // Default: Employee role
  const [joiningDate, setJoiningDate] = useState('');
  const [birthday, setBirthday] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMasters = async () => {
    const [empRes, deptRes, locRes, rolesRes] = await Promise.all([
      mastersApi.getEmployees(),
      mastersApi.getDepartments(),
      mastersApi.getLocations(),
      mastersApi.getRoles(),
    ]);
    setEmployees(empRes.data || []);
    setDepartments(deptRes.data || []);
    setLocations(locRes.data || []);
    setRoles(rolesRes.data?.roles || []);
  };

  useEffect(() => {
    fetchMasters();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeCode.trim() || !employeeName.trim() || !email.trim()) return;

    try {
      setIsSubmitting(true);
      await mastersApi.createEmployee({
        employeeCode: employeeCode.trim(),
        employeeName: employeeName.trim(),
        email: email.trim(),
        mobile: mobile.trim() || null,
        designation: designation.trim() || null,
        departmentId: departmentId ? parseInt(departmentId, 10) : null,
        locationId: locationId ? parseInt(locationId, 10) : null,
        roleId: parseInt(roleId, 10),
        joiningDate: joiningDate || null,
        birthday: birthday || null,
      });

      setIsModalOpen(false);
      setEmployeeCode('');
      setEmployeeName('');
      setEmail('');
      setMobile('');
      setDesignation('');
      fetchMasters();
    } catch (err) {
      console.error('Employee creation failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Staff & Employee Directory
          </h3>
          <p className="text-xs text-slate-500">Manage organizational members, login credentials, and department assignments</p>
        </div>
        <Button size="sm" onClick={() => setIsModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
          Add Employee
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((emp) => (
          <div
            key={emp.EmployeeID}
            className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-3 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                  {emp.EmployeeName.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {emp.EmployeeName}
                  </h4>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">{emp.EmployeeCode}</span>
                </div>
              </div>
              <Badge variant="primary">{emp.RoleName || 'Employee'}</Badge>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="font-medium text-slate-800 dark:text-slate-200">{emp.Designation || 'Staff'} • {emp.DepartmentName || 'General'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate">{emp.Email}</span>
              </div>
              {emp.Mobile && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>{emp.Mobile}</span>
                </div>
              )}
              {emp.Birthday && (
                <div className="flex items-center gap-2 text-[11px] text-pink-600 dark:text-pink-400">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Birthday: {new Date(emp.Birthday).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg" title="Register New Employee">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Employee Code" placeholder="EMP-011" value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} required />
              <Input label="Full Name" placeholder="Priya Deshmukh" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Email (Login Username)" type="email" placeholder="priya.deshmukh@apexcorp.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input label="Mobile Number" placeholder="+91 98..." value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input label="Designation" placeholder="Systems Engineer" value={designation} onChange={(e) => setDesignation(e.target.value)} />
              <Select label="Department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">Select Department...</option>
                {departments.map((d) => (
                  <option key={d.DepartmentID} value={d.DepartmentID}>
                    {d.DepartmentName}
                  </option>
                ))}
              </Select>
              <Select label="Location" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">Select Location...</option>
                {locations.map((l) => (
                  <option key={l.LocationID} value={l.LocationID}>
                    {l.LocationName}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select label="System Security Role" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                {roles.map((r) => (
                  <option key={r.RoleID} value={r.RoleID}>
                    {r.RoleName}
                  </option>
                ))}
              </Select>
              <Input label="Joining Date" type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
              <Input label="Birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Register Employee
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
