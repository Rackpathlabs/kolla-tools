/* Rackpathlabs — wartości domyślne kolla-ansible dla kluczy, które generator emituje.
 *
 * ŹRÓDŁO PRAWDY. Ten plik nie jest nigdzie ładowany — narzędzia są samodzielnymi
 * plikami HTML działającymi z file://, więc blok poniżej jest wklejony bajtowo
 * identycznie do generator.html. Tylko tam: walidator i hub tej tabeli nie czytają.
 *
 * SKĄD TO JEST. Każde wydanie niesie tag, ścieżkę i SHA obiektu, z którego wartości
 * odczytano. Sprawdzenie jednym poleceniem:
 *
 *     git -C <klon kolla-ansible> show 22.1.0:ansible/group_vars/all/network.yml
 *
 * a dla wydania 2025.1, gdzie group_vars/all jest jeszcze POJEDYNCZYM PLIKIEM:
 *
 *     git -C <klon> show 20.5.0:ansible/group_vars/all.yml
 *
 * Od 21.x to KATALOG, więc sha wydania jest sha DRZEWA, nie bloba — dlatego pole
 * nazywa się sha, a nie blob, i dlatego ścieżka wydania kończy się ukośnikiem.
 *
 * LITERAL KONTRA EXPR. `literal` to wartość skalarna zapisana DOKŁADNIE tak, jak stoi
 * w źródle — z cudzysłowami, jeśli tam są, bo pisownia jest informacją: między 21.x
 * a 22.x trzynaście wartości zmieniło się z "no" na false bez zmiany znaczenia.
 * `expr` to wyrażenie Jinja, przepisane dosłownie i NIGDY nie porównywane — jego
 * wyliczenie wymagałoby interpretera i całego kontekstu zmiennych, a dałoby wartość,
 * której w pliku nie ma (ADR-005).
 *
 * KIND "map" to klucz, którego domyślna wartość jest MAPĄ i mieszka w roli, a nie
 * w group_vars/all. Ansible zastępuje słowniki, więc generator musi wypisać całą —
 * `literal` niesie ją w całości, dosłownie ze źródła.
 *
 * NIE WPISUJ TU NICZEGO Z RĘKI. Wartości pochodzą z otagowanego drzewa i wraca po nie
 * tools/upstream_watch.py; wpis dopisany z pamięci jest dokładnie tą pomyłką, którą
 * ten rejestr ma uniemożliwić — cztery nazwy kluczy już ją kosztowały (#182, #184,
 * #185). Klucza bez źródła nie wolno emitować, a rodzaju "absent" tu nie ma.
 *
 * Zmiana danych = edycja TEGO pliku, potem:
 *     bash tools/sync-blocks.sh
 *     bash tools/check-blocks.sh
 */

  /* == KOLLA-DEFAULTS BEGIN — generowane z defaults.js, nie edytuj w miejscu == */
  var KOLLA_DEFAULTS = {
    releases: {
      "2025.1": { tag: "20.5.0", catalogued: true,
                 path: "ansible/group_vars/all.yml", sha: "7e049a6f10eb55ccf4c24e17235392cba192e77c" },
      "2025.2": { tag: "21.2.0", catalogued: true,
                 path: "ansible/group_vars/all/", sha: "3145f775fb14fa420f41f8cfaca28ed33491824a" },
      "2026.1": { tag: "22.1.0", catalogued: true,
                 path: "ansible/group_vars/all/", sha: "6d3ced620a6febb9c3aec9eb906c7ebe3c879817" },
      "2026.2": { catalogued: false },
      "2024.2": { catalogued: false },
      "2024.1": { catalogued: false },
      "2023.2": { catalogued: false },
      "2023.1": { catalogued: false },
      "zed": { catalogued: false },
      "yoga": { catalogued: false }
    },
    keys: {
      "api_interface": { kind: "derived",
        values: {
          "2025.1": { expr: '"{{ network_interface }}"', path: "ansible/group_vars/all.yml", line: 300 },
          "2025.2": { expr: '"{{ network_interface }}"', path: "ansible/group_vars/all/common.yml", line: 239 },
          "2026.1": { expr: '"{{ network_interface }}"', path: "ansible/group_vars/all/common.yml", line: 240 }
        } },
      "enable_barbican": { kind: "scalar",
        values: {
          "2025.1": { literal: '"no"', path: "ansible/group_vars/all.yml", line: 854 },
          "2025.2": { literal: '"no"', path: "ansible/group_vars/all/barbican.yml", line: 2 },
          "2026.1": { literal: 'false', path: "ansible/group_vars/all/barbican.yml", line: 2 }
        } },
      "enable_cinder": { kind: "scalar",
        values: {
          "2025.1": { literal: '"no"', path: "ansible/group_vars/all.yml", line: 863 },
          "2025.2": { literal: '"no"', path: "ansible/group_vars/all/cinder.yml", line: 2 },
          "2026.1": { literal: 'false', path: "ansible/group_vars/all/cinder.yml", line: 2 }
        } },
      "enable_grafana": { kind: "scalar",
        values: {
          "2025.1": { literal: '"no"', path: "ansible/group_vars/all.yml", line: 883 },
          "2025.2": { literal: '"no"', path: "ansible/group_vars/all/grafana.yml", line: 2 },
          "2026.1": { literal: 'false', path: "ansible/group_vars/all/grafana.yml", line: 2 }
        } },
      "enable_hacluster": { kind: "derived",
        values: {
          "2025.1": { expr: '"{{ enable_masakari_hostmonitor | bool }}"', path: "ansible/group_vars/all.yml", line: 885 },
          "2025.2": { expr: '"{{ enable_masakari_hostmonitor | bool }}"', path: "ansible/group_vars/all/hacluster.yml", line: 2 },
          "2026.1": { expr: '"{{ enable_masakari_hostmonitor | bool }}"', path: "ansible/group_vars/all/hacluster.yml", line: 2 }
        } },
      "enable_haproxy": { kind: "scalar",
        values: {
          "2025.1": { literal: '"yes"', path: "ansible/group_vars/all.yml", line: 836 },
          "2025.2": { literal: '"yes"', path: "ansible/group_vars/all/haproxy.yml", line: 2 },
          "2026.1": { literal: 'true', path: "ansible/group_vars/all/haproxy.yml", line: 2 }
        } },
      "enable_heat": { kind: "derived",
        values: {
          "2025.1": { expr: '"{{ enable_openstack_core | bool }}"', path: "ansible/group_vars/all.yml", line: 886 },
          "2025.2": { expr: '"{{ enable_openstack_core | bool }}"', path: "ansible/group_vars/all/heat.yml", line: 2 },
          "2026.1": { expr: '"{{ enable_openstack_core | bool }}"', path: "ansible/group_vars/all/heat.yml", line: 2 }
        } },
      "enable_horizon": { kind: "derived",
        values: {
          "2025.1": { expr: '"{{ enable_openstack_core | bool }}"', path: "ansible/group_vars/all.yml", line: 887 },
          "2025.2": { expr: '"{{ enable_openstack_core | bool }}"', path: "ansible/group_vars/all/horizon.yml", line: 2 },
          "2026.1": { expr: '"{{ enable_openstack_core | bool }}"', path: "ansible/group_vars/all/horizon.yml", line: 2 }
        } },
      "enable_letsencrypt": { kind: "scalar",
        values: {
          "2025.1": { literal: '"no"', path: "ansible/group_vars/all.yml", line: 913 },
          "2025.2": { literal: '"no"', path: "ansible/group_vars/all/letsencrypt.yml", line: 2 },
          "2026.1": { literal: 'false', path: "ansible/group_vars/all/letsencrypt.yml", line: 2 }
        } },
      "enable_masakari": { kind: "scalar",
        values: {
          "2025.1": { literal: '"no"', path: "ansible/group_vars/all.yml", line: 923 },
          "2025.2": { literal: '"no"', path: "ansible/group_vars/all/masakari.yml", line: 2 },
          "2026.1": { literal: 'false', path: "ansible/group_vars/all/masakari.yml", line: 2 }
        } },
      "enable_neutron_provider_networks": { kind: "scalar",
        values: {
          "2025.1": { literal: '"no"', path: "ansible/group_vars/all.yml", line: 936 },
          "2025.2": { literal: '"no"', path: "ansible/group_vars/all/neutron.yml", line: 12 },
          "2026.1": { literal: 'false', path: "ansible/group_vars/all/neutron.yml", line: 12 }
        } },
      "enable_octavia": { kind: "scalar",
        values: {
          "2025.1": { literal: '"no"', path: "ansible/group_vars/all.yml", line: 948 },
          "2025.2": { literal: '"no"', path: "ansible/group_vars/all/octavia.yml", line: 2 },
          "2026.1": { literal: 'false', path: "ansible/group_vars/all/octavia.yml", line: 2 }
        } },
      "enable_prometheus": { kind: "scalar",
        values: {
          "2025.1": { literal: '"no"', path: "ansible/group_vars/all.yml", line: 957 },
          "2025.2": { literal: '"no"', path: "ansible/group_vars/all/prometheus.yml", line: 2 },
          "2026.1": { literal: 'false', path: "ansible/group_vars/all/prometheus.yml", line: 2 }
        } },
      "keepalived_virtual_router_id": { kind: "scalar",
        values: {
          "2025.1": { literal: '"51"', path: "ansible/group_vars/all.yml", line: 247 },
          "2025.2": { literal: '"51"', path: "ansible/group_vars/all/keepalived.yml", line: 8 },
          "2026.1": { literal: '"51"', path: "ansible/group_vars/all/keepalived.yml", line: 8 }
        } },
      "kolla_base_distro": { kind: "scalar",
        values: {
          "2025.1": { literal: '"rocky"', path: "ansible/group_vars/all.yml", line: 52 },
          "2025.2": { literal: '"rocky"', path: "ansible/group_vars/all/common.yml", line: 181 },
          "2026.1": { literal: '"rocky"', path: "ansible/group_vars/all/common.yml", line: 180 }
        } },
      "kolla_copy_ca_into_containers": { kind: "scalar",
        values: {
          "2025.1": { literal: '"no"', path: "ansible/group_vars/all.yml", line: 1064 },
          "2025.2": { literal: '"no"', path: "ansible/group_vars/all/haproxy.yml", line: 17 },
          "2026.1": { literal: 'false', path: "ansible/group_vars/all/haproxy.yml", line: 17 }
        } },
      "kolla_enable_tls_internal": { kind: "scalar",
        values: {
          "2025.1": { literal: '"no"', path: "ansible/group_vars/all.yml", line: 1058 },
          "2025.2": { literal: '"no"', path: "ansible/group_vars/all/haproxy.yml", line: 11 },
          "2026.1": { literal: 'false', path: "ansible/group_vars/all/haproxy.yml", line: 11 }
        } },
      "kolla_external_fqdn": { kind: "derived",
        values: {
          "2025.1": { expr: '"{{ kolla_internal_fqdn if kolla_same_external_internal_vip | bool else kolla_external_vip_address }}"', path: "ansible/group_vars/all.yml", line: 58 },
          "2025.2": { expr: '"{{ kolla_internal_fqdn if kolla_same_external_internal_vip | bool else kolla_external_vip_address }}"', path: "ansible/group_vars/all/common.yml", line: 187 },
          "2026.1": { expr: '"{{ kolla_internal_fqdn if kolla_same_external_internal_vip | bool else kolla_external_vip_address }}"', path: "ansible/group_vars/all/common.yml", line: 191 }
        } },
      "kolla_external_vip_address": { kind: "derived",
        values: {
          "2025.1": { expr: '"{{ kolla_internal_vip_address }}"', path: "ansible/group_vars/all.yml", line: 56 },
          "2025.2": { expr: '"{{ kolla_internal_vip_address }}"', path: "ansible/group_vars/all/common.yml", line: 185 },
          "2026.1": { expr: '"{{ kolla_internal_vip_address }}"', path: "ansible/group_vars/all/common.yml", line: 184 }
        } },
      "kolla_external_vip_interface": { kind: "derived",
        values: {
          "2025.1": { expr: '"{{ network_interface }}"', path: "ansible/group_vars/all.yml", line: 299 },
          "2025.2": { expr: '"{{ network_interface }}"', path: "ansible/group_vars/all/common.yml", line: 238 },
          "2026.1": { expr: '"{{ network_interface }}"', path: "ansible/group_vars/all/common.yml", line: 239 }
        } },
      "kolla_internal_fqdn": { kind: "derived",
        values: {
          "2025.1": { expr: '"{{ kolla_internal_vip_address }}"', path: "ansible/group_vars/all.yml", line: 55 },
          "2025.2": { expr: '"{{ kolla_internal_vip_address }}"', path: "ansible/group_vars/all/common.yml", line: 184 },
          "2026.1": { expr: '"{{ kolla_internal_vip_address }}"', path: "ansible/group_vars/all/common.yml", line: 183 }
        } },
      "kolla_internal_vip_address": { kind: "derived",
        values: {
          "2025.1": { expr: '"{{ kolla_internal_address | default(\'\') }}"', path: "ansible/group_vars/all.yml", line: 54 },
          "2025.2": { expr: '"{{ kolla_internal_address | default(\'\') }}"', path: "ansible/group_vars/all/common.yml", line: 183 },
          "2026.1": { expr: '"{{ kolla_internal_address | default(\'\') }}"', path: "ansible/group_vars/all/common.yml", line: 182 }
        } },
      "migration_interface": { kind: "derived",
        values: {
          "2025.1": { expr: '"{{ api_interface }}"', path: "ansible/group_vars/all.yml", line: 301 },
          "2025.2": { expr: '"{{ api_interface }}"', path: "ansible/group_vars/all/nova.yml", line: 40 },
          "2026.1": { expr: '"{{ api_interface }}"', path: "ansible/group_vars/all/nova.yml", line: 40 }
        } },
      "network_interface": { kind: "scalar",
        values: {
          "2025.1": { literal: '"eth0"', path: "ansible/group_vars/all.yml", line: 297 },
          "2025.2": { literal: '"eth0"', path: "ansible/group_vars/all/common.yml", line: 237 },
          "2026.1": { literal: '"eth0"', path: "ansible/group_vars/all/common.yml", line: 238 }
        } },
      "neutron_bridge_name": { kind: "derived",
        values: {
          "2025.1": { expr: '"{{ \'br-dvs\' if neutron_plugin_agent == \'vmware_dvs\' else \'br_dpdk\' if enable_ovs_dpdk | bool else \'br-ex\' }}"', path: "ansible/group_vars/all.yml", line: 1214 },
          "2025.2": { expr: '"{{ \'br_dpdk\' if enable_ovs_dpdk | bool else \'br-ex\' }}"', path: "ansible/group_vars/all/neutron.yml", line: 37 },
          "2026.1": { expr: '"{{ \'br_dpdk\' if enable_ovs_dpdk | bool else \'br-ex\' }}"', path: "ansible/group_vars/all/neutron.yml", line: 37 }
        } },
      "neutron_external_interface": { kind: "scalar",
        values: {
          "2025.1": { literal: '"eth1"', path: "ansible/group_vars/all.yml", line: 298 },
          "2025.2": { literal: '"eth1"', path: "ansible/group_vars/all/neutron.yml", line: 31 },
          "2026.1": { literal: '"eth1"', path: "ansible/group_vars/all/neutron.yml", line: 31 }
        } },
      "neutron_plugin_agent": { kind: "scalar",
        values: {
          "2025.1": { literal: '"openvswitch"', path: "ansible/group_vars/all.yml", line: 332 },
          "2025.2": { literal: '"openvswitch"', path: "ansible/group_vars/all/neutron.yml", line: 26 },
          "2026.1": { literal: '"openvswitch"', path: "ansible/group_vars/all/neutron.yml", line: 26 }
        } },
      "octavia_amp_network": { kind: "map",
        /* Mapa z roli, nie z group_vars/all. Wypisywana w całości, bo Ansible
           zastępuje słowniki zamiast je scalać (hash_behaviour nie jest ustawione
           nigdzie w drzewie kolla-ansible). Pokazywana, nigdy porównywana. */
        values: {
          "2025.1": { literal: 'octavia_amp_network:\n  name: lb-mgmt-net\n  shared: false\n  subnet:\n    name: lb-mgmt-subnet\n    cidr: "{{ octavia_amp_network_cidr }}"\n    no_gateway_ip: yes\n    enable_dhcp: yes\n',
                     path: "ansible/roles/octavia/defaults/main.yml", line: 370, sha: "6184ccc4e6cf823c67667e917f32af490bcdb5f2" },
          "2025.2": { literal: 'octavia_amp_network:\n  name: lb-mgmt-net\n  shared: false\n  subnet:\n    name: lb-mgmt-subnet\n    cidr: "{{ octavia_amp_network_cidr }}"\n    no_gateway_ip: yes\n    enable_dhcp: yes\n',
                     path: "ansible/roles/octavia/defaults/main.yml", line: 377, sha: "e683e67669806cc0c844a23302733ddf8a123b90" },
          "2026.1": { literal: 'octavia_amp_network:\n  name: lb-mgmt-net\n  shared: false\n  subnet:\n    name: lb-mgmt-subnet\n    cidr: "{{ octavia_amp_network_cidr }}"\n    no_gateway_ip: true\n    enable_dhcp: true\n',
                     path: "ansible/roles/octavia/defaults/main.yml", line: 377, sha: "1909af8cff27e80d154728170597b4f804e665c1" }
        } },
      "octavia_network_type": { kind: "scalar",
        values: {
          "2025.1": { literal: '"provider"', path: "ansible/group_vars/all.yml", line: 1419 },
          "2025.2": { literal: '"provider"', path: "ansible/group_vars/all/octavia.yml", line: 20 },
          "2026.1": { literal: '"provider"', path: "ansible/group_vars/all/octavia.yml", line: 20 }
        } },
      "om_enable_rabbitmq_stream_fanout": { kind: "scalar",
        values: {
          "2025.1": { literal: 'true', path: "ansible/group_vars/all.yml", line: 292 },
          "2025.2": { literal: 'true', path: "ansible/group_vars/all/common.yml", line: 293 },
          "2026.1": { literal: 'true', path: "ansible/group_vars/all/common.yml", line: 299 }
        } },
      "openstack_release": { kind: "scalar",
        values: {
          "2025.1": { literal: '"2025.1"', path: "ansible/group_vars/all.yml", line: 795 },
          "2025.2": { literal: '"2025.2"', path: "ansible/group_vars/all/common.yml", line: 308 },
          "2026.1": { literal: '"2026.1"', path: "ansible/group_vars/all/common.yml", line: 310 }
        } }
    }
  };
  /* == KOLLA-DEFAULTS END == */
