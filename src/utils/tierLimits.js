export const TIERS = {
  starter: { name: 'Starter', maxEmployees: 25 },
  business: { name: 'Business', maxEmployees: 100 },
  enterprise: { name: 'Enterprise', maxEmployees: 300 },
  enterprise_plus: { name: 'Enterprise Plus', maxEmployees: 1000 },
  ai: { name: 'WorkTrack AI', maxEmployees: 1000 },
};

export function canAddEmployee(tenantId) {
  const { getTable } = require('./localStorage');
  const tenants = getTable('worktrack_tenants');
  const tenant = tenants.find(t => t.id === tenantId);
  const tier = TIERS[tenant?.plan] || TIERS.starter;
  const employees = getTable('worktrack_employees').filter(e => e.tenantId === tenantId && e.isActive);
  return {
    allowed: employees.length < tier.maxEmployees,
    currentCount: employees.length,
    maxEmployees: tier.maxEmployees,
    tierName: tier.name,
  };
}
