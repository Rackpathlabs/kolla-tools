/* Fixtura check-defaults.js — minimalny rejestr. */
var KOLLA_DEFAULTS = {
  releases: { "2026.1": { tag: "22.1.0", catalogued: true,
                          path: "ansible/group_vars/all/", sha: "6d3ced62" } },
  keys: {
    "network_interface": { kind: "scalar",
      values: { "2026.1": { literal: '"eth0"', path: "ansible/group_vars/all/network.yml", line: 3 } } },
    "neutron_external_interface": { kind: "scalar",
      values: { "2026.1": { literal: '"eth0"', path: "ansible/group_vars/all/network.yml", line: 3 } } },
    "openstack_release": { kind: "scalar",
      values: { "2026.1": { literal: '"eth0"', path: "ansible/group_vars/all/network.yml", line: 3 } } }
  }
};
