import React, { useState, useEffect } from 'react';
import { User, Plus, Mail, Phone, Calendar, Building, MapPin, Pencil, Trash2, KeyRound } from 'lucide-react';
import { mastersApi } from '../../services/api';
import { Employee, Department, Location, Role } from '../../types';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';

export const EmployeesTab: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form Fields
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
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMasters = async () => {
    try {
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
    } catch (err) {
      console.error('Failed to fetch masters:', err);
    }
  };

  useEffect(() => {
    fetchMasters();
  }, []);

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setEmployeeCode('');
    setEmployeeName('');
    setEmail('');
    setMobile('');
    setDesignation('');
    setDepartmentId('');
    setLocationId('');
    setRoleId('5');
    setJoiningDate('');
    setBirthday('');
    setPassword('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmployeeCode(emp.EmployeeCode || '');
    setEmployeeName(emp.EmployeeName || '');
    setEmail(emp.Email || '');
    setMobile(emp.Mobile || '');
    setDesignation(emp.Designation || '');
    setDepartmentId(emp.DepartmentID ? String(emp.DepartmentID) : '');
    setLocationId(emp.LocationID ? String(emp.LocationID) : '');
    setRoleId(emp.RoleID ? String(emp.RoleID) : '5');
    setJoiningDate(emp.JoiningDate ? emp.JoiningDate.substring(0, 10) : '');
    setBirthday(emp.Birthday ? emp.Birthday.substring(0, 10) : '');
    setPassword('');
    setIsModalOpen(true);
  };

  const handleOpenDelete = (emp: Employee) => {
    setEmployeeToDelete(emp);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!employeeToDelete) return;
    try {
      setIsDeleting(true);
      await mastersApi.deleteEmployee(employeeToDelete.EmployeeID);
      setIsDeleteModalOpen(false);
      setEmployeeToDelete(null);
      await fetchMasters();
    } catch (err) {
      console.error('Failed to delete employee:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeCode.trim() || !employeeName.trim() || !email.trim()) return;

    try {
      setIsSubmitting(true);

      if (editingEmployee) {
        // UPDATE existing employee
        await mastersApi.updateEmployee(editingEmployee.EmployeeID, {
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
          password: password.trim() || undefined,
        });
      } else {
        // CREATE new employee
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
          createUserAccount: true,
          password: password.trim() || 'Password@123',
        });
      }

      setIsModalOpen(false);
      setEditingEmployee(null);
      await fetchMasters();
    } catch (err) {
      console.error('Employee save failed:', err);
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
        <Button size="sm" onClick={handleOpenAdd} icon={<Plus className="w-4 h-4" />}>
          Add Employee
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((emp) => (
          <div
            key={emp.EmployeeID}
            className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-3 hover:shadow-md transition relative group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold text-sm flex items-center justify-center shadow-sm flex-shrink-0">
                  {emp.EmployeeName.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {emp.EmployeeName}
                  </h4>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">{emp.EmployeeCode}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Badge variant="primary">{emp.RoleName || 'Employee'}</Badge>
                <button
                  type="button"
                  title="Edit Employee"
                  onClick={() => handleOpenEdit(emp)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Delete Employee"
                  onClick={() => handleOpenDelete(emp)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                  {emp.Designation || 'Staff'} • {emp.DepartmentName || 'General'}
                </span>
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

        {employees.length === 0 && (
          <div className="col-span-full py-12 text-center bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <User className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No employees registered yet</p>
            <p className="text-xs text-slate-500 mb-4">Click below to add your first employee.</p>
            <Button size="sm" onClick={handleOpenAdd} icon={<Plus className="w-4 h-4" />}>
              Add Employee
            </Button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingEmployee(null);
          }}
          size="lg"
          title={editingEmployee ? `Edit Employee: ${editingEmployee.EmployeeName}` : "Register New Employee"}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Employee Code"
                placeholder="EMP-001"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                required
              />
              <Input
                label="Full Name"
                placeholder="Priya Deshmukh"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Email (Login Username)"
                type="email"
                placeholder="priya@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Mobile Number"
                placeholder="+91 98..."
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Designation"
                placeholder="Systems Engineer"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
              />
              <Select
                label="Department"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                <option value="">Select Department...</option>
                {departments.map((d) => (
                  <option key={d.DepartmentID} value={d.DepartmentID}>
                    {d.DepartmentName}
                  </option>
                ))}
              </Select>
              <Select
                label="Location"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              >
                <option value="">Select Location...</option>
                {locations.map((l) => (
                  <option key={l.LocationID} value={l.LocationID}>
                    {l.LocationName}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="System Security Role"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
              >
                {roles.map((r) => (
                  <option key={r.RoleID} value={r.RoleID}>
                    {r.RoleName}
                  </option>
                ))}
              </Select>
              <Input
                label="Joining Date"
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
              />
              <Input
                label="Birthday"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                <span>{editingEmployee ? "Reset Login Password (Optional)" : "Initial Login Password"}</span>
              </div>
              <Input
                placeholder={editingEmployee ? "Leave blank to keep existing password" : "Password@123"}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-[11px] text-slate-500">
                {editingEmployee
                  ? "Enter a new password only if you want to reset this employee's credentials."
                  : "Defaults to Password@123 if left blank."}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingEmployee(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                {editingEmployee ? "Update Employee" : "Register Employee"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {isDeleteModalOpen && employeeToDelete && (
        <ConfirmDialog
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setEmployeeToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          title="Delete Employee"
          message={`Are you sure you want to delete ${employeeToDelete.EmployeeName} (${employeeToDelete.EmployeeCode})? This will deactivate their employee record and associated user account.`}
          confirmText="Delete"
          variant="danger"
          isLoading={isDeleting}
        />
      )}
    </div>
  );
};
