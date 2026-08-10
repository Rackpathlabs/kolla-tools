/* Rackpathlabs — macierz wydań Kolla-Ansible.
 *
 * ŹRÓDŁO PRAWDY. Ten plik nie jest nigdzie ładowany — narzędzia są samodzielnymi
 * plikami HTML działającymi z file://, więc blok poniżej jest wklejony bajtowo
 * identycznie do generator.html i validator.html między te same znaczniki.
 *
 * Zmiana macierzy = edycja TEGO pliku, potem:
 *     bash tools/sync-blocks.sh      # przepisuje bloki do obu plików HTML
 *     bash tools/check-blocks.sh     # sprawdza, że wszystkie kopie są zgodne
 *
 * Wcięcie dwóch spacji jest celowe — blok żyje wewnątrz IIFE w obu plikach HTML
 * i musi być tam identyczny co do bajtu.
 *
 * Dane zweryfikowane 2026-08-10 wobec:
 *   docs.openstack.org/kolla-ansible/<wydanie>/user/support-matrix.html
 *   docs.openstack.org/releasenotes/kolla-ansible/<wydanie>.html
 *   releases.openstack.org
 */

  /* == KOLLA-MATRIX BEGIN — generowane z matrix.js, nie edytuj w miejscu == */
  /* Jedna tabela konsumowana przez oba narzędzia. Dodanie wydania = dopisanie
     wpisu do releases[] — bez zmian w logice.

     status:      development | maintained | unmaintained | eol
     kolla:       seria kolla-ansible odpowiadająca wydaniu (null = gałąź rozwojowa)
     baseDistros: dopuszczalne wartości kolla_base_distro (null = brak danych, wydanie
                  poza wsparciem — narzędzie nie zgaduje)
     unpublished: distro dopuszczalne w konfiguracji, ale bez publikowanych obrazów
     hostOs:      systemy hosta wspierane przez to wydanie (informacyjnie)
     released:    data wydania; null, jeśli jeszcze nie wydane
     expected:    planowana data wydania — wyłącznie dla status 'development'
     endsOn:      data zmiany statusu wsparcia: dla 'maintained' planowana, dla
                  'unmaintained' i 'eol' ta, w której nastąpiła; dla 'development'
                  null — wydanie, które się nie ukazało, nie ma kiedy przestać być
                  wspierane
     defaults:    domyślne wartości istotne dla decyzji wdrożeniowych; opis klucza
                  leży w keys[] — jeden opis na klucz, nie na wydanie
     deprecated:  { kind: 'key'|'group'|'service', name, replacedBy, sev, note }
                  kind 'key' konsumuje generator, 'group'/'service' — walidator;
                  sev ('error'|'warn'|'info') jest w danych, bo waga zależy od wpisu:
                  przemianowana grupa to błąd, usunięta usługa to uwaga, zmiana grupy
                  nadrzędnej to informacja */
  var KOLLA_MATRIX = {
    schema: 1,
    updated: "2026-08-10",

    /* Opis klucza żyje tu raz, nie przy każdym wydaniu.
       notable: klucz dotyczy każdego wdrożenia i narzędzie wspomina o nim zawsze.
                false = klucz ma sens dopiero przy włączonej konkretnej usłudze,
                więc czeka na przełączniki enable_* (issue #6).
       sev:     waga wpisu, gdy plik nie ustawia klucza jawnie. 'warn' zarezerwowane
                dla wartości domyślnych, które działają, ale niosą ryzyko przy skali;
                'info' dla zmian wartości bez ryzyka. */
    keys: {
      om_enable_rabbitmq_stream_fanout: {
        notable: true, sev: "warn",
        label: "kolejki strumieniowe dla fanoutów RabbitMQ",
        why: "Przy wartości domyślnej <code>true</code> liderzy wszystkich strumieni potrafią " +
             "wylądować na jednym brokerze. Przy trzech węzłach control warto zweryfikować " +
             "rozłożenie liderów po wdrożeniu."
      },
      om_rabbitmq_qos_prefetch_count: {
        notable: true, sev: "info",
        label: "prefetch QoS dla RabbitMQ",
        why: "Od 2026.1 domyślnie 50 zamiast wartości nieograniczonej — zmiana wpływa " +
             "na rozkład obciążenia między workerami."
      },
      enable_ironic_inspector: {
        notable: false,
        label: "Ironic Inspector",
        why: "Projekt wycofany; od 2025.1 domyślnie wyłączony i przewidziany do usunięcia."
      },
      enable_ironic_neutron_agent: {
        notable: false,
        label: "agent Neutron dla Ironic",
        why: "Od 2025.1 domyślnie wyłączony."
      }
    },

    releases: [
      {
        id: "2026.2", name: "Hibiscus", kolla: null, status: "development",
        released: null, expected: "2026-09-30", endsOn: null,
        baseDistros: null, unpublished: [], hostOs: [],
        defaults: {},
        deprecated: []
      },
      {
        id: "2026.1", name: "Gazpacho", kolla: "22.x", status: "maintained",
        released: "2026-04-01", expected: null, endsOn: "2027-10-27",
        baseDistros: ["centos", "debian", "rocky", "ubuntu"],
        unpublished: ["centos"],
        hostOs: ["CentOS Stream 10", "Debian Trixie (13)", "Rocky Linux 10", "Ubuntu Noble (24.04)"],
        defaults: {
          om_enable_rabbitmq_stream_fanout: true,
          om_rabbitmq_qos_prefetch_count: 50
        },
        deprecated: [
          { kind: "group", name: "kolla-toolbox", replacedBy: "kolla_toolbox", sev: "error",
            note: "Grupa i rola przemianowane — myślnik zastąpiony podkreśleniem. Stara nazwa nie zostanie rozpoznana." },
          { kind: "service", name: "zun", replacedBy: null, sev: "warn",
            note: "Usunięte w 2026.1 (niedziałające)." },
          { kind: "service", name: "kuryr", replacedBy: null, sev: "warn",
            note: "Usunięte razem z Zun, który był jedynym konsumentem." },
          { kind: "service", name: "influxdb", replacedBy: null, sev: "warn",
            note: "Usunięte — InfluxDB v1 osiągnęło EOL, migracji do v2 nie zaplanowano." },
          { kind: "service", name: "telegraf", replacedBy: null, sev: "warn",
            note: "Usunięte po wcześniejszej deprecjacji." },
          { kind: "service", name: "venus", replacedBy: null, sev: "warn",
            note: "Usunięte z powodu braku aktywności projektu." },
          { kind: "group", name: "cinder-volume", replacedBy: null, sev: "info",
            note: "Domyślna grupa nadrzędna zmieniona ze <code>storage</code> na <code>cinder</code>." },
          { kind: "group", name: "cinder-backup", replacedBy: null, sev: "info",
            note: "Domyślna grupa nadrzędna zmieniona ze <code>storage</code> na <code>cinder</code>." },
          { kind: "key", name: "distro_python_version", replacedBy: null, sev: "warn",
            note: "Usunięte." },
          { kind: "key", name: "lightbits_JWT", replacedBy: "lightbits_jwt", sev: "error",
            note: "Przemianowane — zmieniona wielkość liter." }
        ]
      },
      {
        id: "2025.2", name: "Flamingo", kolla: "21.x", status: "maintained",
        released: "2025-10-01", expected: null, endsOn: "2027-04-28",
        baseDistros: ["centos", "debian", "rocky", "ubuntu"],
        unpublished: ["centos"],
        hostOs: ["CentOS Stream 10", "Debian Bookworm (12)", "Rocky Linux 10", "Ubuntu Noble (24.04)"],
        defaults: {
          om_enable_rabbitmq_stream_fanout: true
        },
        deprecated: []
      },
      {
        id: "2025.1", name: "Epoxy", kolla: "20.x", status: "maintained",
        released: "2025-04-02", expected: null, endsOn: "2026-10-02",
        baseDistros: ["centos", "debian", "rocky", "ubuntu"],
        unpublished: ["centos"],
        hostOs: ["CentOS Stream 9", "CentOS Stream 10", "Debian Bookworm (12)",
                 "Rocky Linux 9", "Rocky Linux 10", "Ubuntu Noble (24.04)"],
        defaults: {
          om_enable_rabbitmq_stream_fanout: true,
          enable_ironic_inspector: false,
          enable_ironic_neutron_agent: false
        },
        deprecated: [
          { kind: "key", name: "om_enable_rabbitmq_high_availability", replacedBy: null, sev: "error",
            note: "Usunięte — kolejki quorum są od tego wydania obowiązkowe." },
          { kind: "key", name: "letsencrypt_cert_server", replacedBy: "letsencrypt_external_cert_server", sev: "error",
            note: "Przemianowane." },
          { kind: "key", name: "openstack_previous_release_name", replacedBy: "ironic_pin_release_version", sev: "error",
            note: "Przemianowane." },
          { kind: "key", name: "ceph_cinder_keyring", replacedBy: null, sev: "warn", note: "Usunięte." },
          { kind: "key", name: "ceph_cinder_backup_keyring", replacedBy: null, sev: "warn", note: "Usunięte." },
          { kind: "key", name: "ceph_glance_keyring", replacedBy: null, sev: "warn", note: "Usunięte." },
          { kind: "key", name: "ceph_gnocchi_keyring", replacedBy: null, sev: "warn", note: "Usunięte." },
          { kind: "key", name: "ceph_manila_keyring", replacedBy: null, sev: "warn", note: "Usunięte." },
          { kind: "key", name: "ceph_nova_keyring", replacedBy: null, sev: "warn", note: "Usunięte." },
          { kind: "service", name: "swift", replacedBy: null, sev: "warn",
            note: "Wsparcie dla wdrożenia Swift usunięte w 2025.1." }
        ]
      },
      {
        id: "2024.2", name: "Dalmatian", kolla: "19.x", status: "eol",
        released: "2024-10-02", expected: null, endsOn: "2026-04-29",
        baseDistros: ["centos", "debian", "rocky", "ubuntu"],
        unpublished: ["centos"],
        hostOs: ["CentOS Stream 9", "Debian Bookworm (12)", "Rocky Linux 9",
                 "Ubuntu Jammy (22.04)", "Ubuntu Noble (24.04)"],
        defaults: {},
        deprecated: []
      },
      {
        id: "2024.1", name: "Caracal", kolla: "18.x", status: "unmaintained",
        released: "2024-04-03", expected: null, endsOn: null,
        baseDistros: ["centos", "debian", "rocky", "ubuntu"],
        unpublished: ["centos"],
        hostOs: ["CentOS Stream 9", "Debian Bullseye (11)", "Debian Bookworm (12)",
                 "openEuler 22.03 LTS", "Rocky Linux 9",
                 "Ubuntu Jammy (22.04)", "Ubuntu Noble (24.04)"],
        defaults: {},
        deprecated: []
      },

      /* Wydania poniżej są poza wsparciem. Macierz distro celowo pozostaje pusta:
         narzędzie ma powiedzieć "brak wsparcia", a nie sugerować konfigurację,
         której nikt już nie testuje. */
      { id: "2023.2", name: "Bobcat",   kolla: "17.x", status: "eol", released: "2023-10-04", expected: null, endsOn: "2025-04-30",
        baseDistros: null, unpublished: [], hostOs: [], defaults: {}, deprecated: [] },
      { id: "2023.1", name: "Antelope", kolla: "16.x", status: "eol", released: "2023-03-22", expected: null, endsOn: null,
        baseDistros: null, unpublished: [], hostOs: [], defaults: {}, deprecated: [] },
      { id: "zed",    name: "Zed",      kolla: "15.x", status: "eol", released: "2022-10-05", expected: null, endsOn: null,
        baseDistros: null, unpublished: [], hostOs: [], defaults: {}, deprecated: [] },
      { id: "yoga",   name: "Yoga",     kolla: "14.x", status: "eol", released: "2022-03-30", expected: null, endsOn: null,
        baseDistros: null, unpublished: [], hostOs: [], defaults: {}, deprecated: [] }
    ]
  };
  /* == KOLLA-MATRIX END == */
