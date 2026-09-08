# Kolla-Ansible static validation ruleset — KV-01 … KV-15

This is the register of the rules the two tools implement, with what each
one will actually cause when it fires. SCOPE.md is the authority on the
boundary — what the tools do not check and why. This document is the
authority on the contents, and it is guarded against the code:
`tools/check-ruleset.js` fails the build when a section here names a code
that neither tool emits, when a code with a `KV-` prefix has no section,
or when a section is marked *not implemented* while a code exists for it.
What the guard cannot check is whether the prose describes the rule the
code implements; that is a reading task, and this page is written so a
reader can do it.

Written against Kolla-Ansible 20.x / OpenStack 2025.1 (Epoxy). Rules that
depend on a release take their data from the release matrix in
`matrix.js`, which both tools carry and which is checked weekly against
the OpenStack release data.

## How to read a section

**Class** is how honestly the rule can be checked statically, in the
browser, from the files in front of you:

- **A** — one file is enough: `globals.yml` alone (generator) or the
  inventory alone (validator).
- **B** — both files at once. Implemented by the validator's combined mode
  (ADR-001): load a `globals.yml` beside the inventory and the class B
  findings join the same list.
- **C** — not statically checkable: needs git history, installed package
  versions, or configuration outside the two files. Documented here so the
  gap is explicit, not silent.

**Codes** are the stable finding identifiers the tools emit; they are the
contract of the JSON export (`schema: 1`). A rule may be implemented by a
code that does not carry its number — the quorum and collocation rules
predate the numbering — and the code line says so.

**Severity never exceeds what the visible file proves.** This is the one
law of the ruleset, and it was written three times before it was named:
KV-04, KV-06, KV-09 and KV-12a all started at *error* and were lowered
where the single file in front of the tool could not prove the condition.
Where the combined mode raises visibility, the severity rises with it.
Where a fact lives outside every file the tool reads — link headroom,
fencing agents — the rule offers an **acknowledgment** that records the
operator's decision and lowers the finding to *info* instead of silencing
it.

## KV-01 — Masakari with hacluster and no fencing evidence

**Class:** B (the globals-only combination could raise a prompt alone; the
inventory supplies the evidence). **Mode:** combined.
**Codes:** `KV-01-FENCING` — error; *info* after acknowledgment (`ack_nobmc`).

**Rule.** `enable_masakari: "yes"` without working STONITH is not high
availability; it is a data-corruption generator.

**Failure mode.** Network isolation of a compute node — not a real host
failure. hostmonitor reports the host down, Masakari evacuates, Nova
rebuilds the instance elsewhere, and the original QEMU is still alive
holding an open RBD descriptor. Two instances write to one Ceph volume;
the guest filesystem is corrupted. Without fencing there is no way to
force-release the lock.

**What the tool checks.** `enable_masakari: "yes"` and
`enable_hacluster: "yes"` in `globals.yml`, and no BMC-type field
(`ipmi_address`, `bmc_host`, …) anywhere in the inventory. No such field
anywhere is enough to say fencing cannot exist.

**What it cannot check.** Whether existing fencing works:
`masakari-monitors.conf` (`disable_ipmi_check`, default true), Pacemaker
`stonith-enabled`, fence agent definitions. These live outside both files
(SCOPE.md, "Fencing agent configuration and service-level overrides").
That is the boundary of this rule, not an exclusion of it.

**Not a bug when.** A lab deliberately without BMC, where Masakari is
test-only — record it with the acknowledgment. An environment named "dev"
is not an exemption; the file will be copied to production.

## KV-02 — [control] count even or below three

**Class:** A (validator). **Mode:** single.
**Codes:** `QUORUM-COUNT` — error; `QUORUM-AIO` — the all-in-one exemption.

**Rule.** `[control]` must hold an odd number of hosts, at least three.
Three independent quorum mechanisms ride on the same list: Galera,
RabbitMQ quorum queues, Corosync.

**Failure mode.** With two hosts, losing one puts Galera in non-Primary:
the whole database is read-only and every write API call returns 500.
With four, losing two — one rack, one switch — kills quorum even though
two healthy nodes remain. It shows up at the first real failover or
during rolling reboots while patching.

**What the tool checks.** Host count in `[control]` after expanding
`:children` and `[a:b]` patterns; alarm on n < 3 or n even. If
`[mariadb]`, `[rabbitmq]`, `[hacluster]` or `[etcd]` define their own
host lists instead of inheriting, each is counted separately.

**Not a bug when.** All-in-one: n == 1 and the same single host is in
`[compute]`. n == 2 is never a false positive. Severity confirmed *error*
on 2026-08-10: even counts are never a false positive, and older issue
text saying *warning* is superseded.

## KV-03 — OVN NB/SB database: even-sized RAFT cluster

**Class:** A (validator). **Mode:** single.
**Codes:** `QUORUM-OVN` — error; `OVN-NORTHD` — mismatch between the
database group and `[ovn-northd]`.

**Rule.** The OVN database group must hold one or three hosts. A two-node
RAFT cluster has worse availability than one node.

**Failure mode.** Deploy succeeds and `ovn-nbctl show` works. On failover,
losing one of two nodes drops RAFT quorum, the NB database goes
read-only, and Neutron cannot create a port or a security group. The
existing dataplane keeps working — OVS still has its flows — so instance
monitoring stays green while the cloud is frozen. Diagnosis takes hours
because "the network works".

**What the tool checks.** The base group (`ovn-database` in the upstream
multinode template), from which nb, sb and northd inherit. Checking the
three children independently reports one mistake three times; verified
against upstream `ansible/inventory/multinode` (amendment 2026-08-10).
Alarm on n even or n > 3. `[ovn-northd]` should carry the same host list;
a mismatch means northd connects remotely.

**Not a bug when.** A deliberate n == 1 in a lab that accepts a
control-plane single point of failure — n == 1 while `[control]` has one
host.

## KV-04 — Same host in [control] and [compute]

**Class:** A (validator), escalation B. **Mode:** single; escalates in
combined mode.
**Codes:** `COLLOCATION-CONTROL-COMPUTE` — warning alone; error when the
loaded `globals.yml` shows `enable_masakari`, `enable_hacluster` or
`enable_pacemaker_remote`.

**Rule.** `[control]` and `[compute]` must be disjoint in any deployment
that runs Masakari or claims to be production.

**Failure mode.** Deploy passes; the lab is perfect. Then either Pacemaker
Remote cannot start on a host that is already a full Corosync member —
visible immediately — or, with `restrict_to_remotes = false`, hostmonitor
treats a control node as an evacuation candidate: a maintenance reboot of
that node makes Masakari try to evacuate instances from the host that
also runs MariaDB and RabbitMQ, through an API that is currently down.
Cascade.

**What the tool checks.** After expanding `:children`, the intersection of
the two host sets. The single-file validator cannot see the escalation
condition, which lives in `globals.yml`, and hyperconverged
control+compute on three nodes without Masakari is a legitimate small
cluster — so the finding is a warning that names the condition
("valid HCI pattern without Masakari; with Masakari this is a
data-corruption error"). Combined mode proves the condition and the same
configuration becomes an error.

**Not a bug when.** All-in-one: exactly one host in the whole inventory.

## KV-05 — Corosync, storage and live migration on one link

**Class:** A on a design input; the file cannot express it (C). **Mode:** single.
**Codes:** `KV-05-STORAGE-API-LINK` — error with `enable_hacluster`,
warning otherwise; *info* after acknowledgment (`ack_link`).

**Rule.** `api_interface` — Corosync takes its ring from it — must not
share a physical link with Ceph traffic or migration traffic without VLAN
separation and QoS.

**Failure mode.** At scale, typically after two to four weeks. A Ceph
backfill, an OSD-replace rebalance, or a single 64 GB live migration
saturates the link. Corosync loses its token (default 3000 ms), Pacemaker
declares the node lost, Masakari starts evacuating a perfectly healthy
host under load. The classic "everything worked for three weeks and then
the cloud killed its own compute node".

**What the tool checks.** `network_interface`, `api_interface`, the
interface the operator names for Ceph traffic, `migration_interface` and
`tunnel_interface` against each other. Alarm when the Ceph interface equals
api, or when it is unnamed — so it follows `network_interface` — while
`enable_hacluster: "yes"`. Base devices are compared, not full strings:
`bond0.10` and `bond0.20` are the same `bond0` — split on the first dot.

The Ceph interface is a **design input, not a key**. The form asks for it, the
rule reasons about it, and the generated file records it as a comment naming
this rule. `globals.yml` has no way to say it, so the finding is about the
design in front of the operator rather than about a line the deployment will
read.

**Amendment 2026-09-08.** This rule was written around `storage_interface` and
that variable does not exist. It was deprecated in the 14.x series — *"deprecated
and will be removed in the next release as it was causing confusion. The variable
only sets the default for `swift_storage_interface`"* — and the removal note
first appears in tag **15.0.0**, three major series before 2025.1, the oldest
release this tool calls maintained. It never carried Ceph traffic. Measured the
same day: `group_vars/all` at 22.1.0 holds thirteen `*_interface` variables and
**none of them is for Ceph or RBD**; there is no `storage_network` either. Kolla
has not deployed Ceph since Ussuri, so where that traffic runs is a property of
the external cluster and the host network. The rule keeps its subject and loses
its key.

**Not a bug when.** A ≥ 2×25G bond with measured headroom and switch-side
QoS. The bond alone settles nothing — LACP hashes per flow, one migration
stream can own one member link entirely. Statically undecidable, hence
the acknowledgment (SCOPE.md, "Switch configuration, bond bandwidth and
QoS policy").

## KV-06 — No migration_interface with HA tooling enabled

**Class:** A (generator); the `nova.conf` false-positive check is C.
**Mode:** single.
**Codes:** `KV-06-MIGRATION-IFACE` — error with `enable_masakari`, warning
with `enable_hacluster` alone, *info* with neither; *info* after
acknowledgment (`ack_migration`).

**Rule.** With Masakari enabled, `migration_interface` must be set
explicitly to something other than `api_interface`.

**Failure mode.** `migration_interface` defaults to `api_interface`. A
host-failure evacuation is a burst of migrations at exactly the moment
the control plane is busiest. Migration traffic starves RPC, nova-compute
on healthy hosts misses heartbeats (`service_down_time`, default 60 s),
Nova marks them down, Masakari sees more hosts to evacuate. Avalanche: one
host failure takes down the cluster.

**What the tool checks.** `migration_interface` missing or equal to
`api_interface`, graded by what the file proves. Without HA tooling,
migration over the API link is the upstream default and normal in labs;
warning-level noise on every minimal file teaches operators to ignore the
lint (amendment 2026-08-10 — third occurrence of the severity law).

**What it cannot check.** `live_migration_bandwidth` and
`live_migration_permit_auto_converge` overrides in the config directory —
whether there is any brake at all. Class C component.

**Not a bug when.** A dedicated migration VLAN configured outside Kolla
via `live_migration_inbound_addr` in a nova-compute override — outside
both files, hence the acknowledgment.

## KV-07 — Several cinder-volume hosts without cinder_cluster_name

**Class:** B. **Mode:** combined.
**Codes:** `KV-07-CINDER-CLUSTER` — error.

**Rule.** If `[storage]` holds more than one host, `cinder_cluster_name`
must be set — otherwise it is not HA, it is N independent backends
sharing one Ceph pool.

**Failure mode.** Months later. Without clustering every volume gets
`host = <node>@ceph#ceph` in the database. Everything works, because Ceph
is shared and attach goes through Nova. After losing that one node,
delete, extend, retype and snapshot on its volumes hang in
`deleting`/`error` forever — no other cinder-volume picks them up. The
fix is a manual `cinder-manage volume update_host` against a production
database.

**What the tool checks.** `len(storage) > 1` after expanding `:children`,
and `cinder_cluster_name` absent from the loaded `globals.yml`.

**What it cannot check.** Per-host backend overrides in `host_vars` that
split the cluster despite a cluster name being set (SCOPE.md, "Per-host
heterogeneity in host_vars"). Class C component.

**Not a bug when.** One host in `[storage]` — an accepted single point of
failure — or a genuinely local backend (LVM without shared storage), where
clustering would itself be the bug.

## KV-08 — keepalived_virtual_router_id left at the upstream default

**Class:** A for the missing key; collision detection is B-adjacent (needs
a second `globals.yml`, which no tool takes). **Mode:** single.
**Codes:** `KV-08-VRID-DEFAULT` — warning on import when the key is absent;
*info* after acknowledgment (`ack_vrid`). `KV-08-VRID-RANGE` — error when the
value is outside 1–255 or is not a number; the acknowledgment does **not**
lower it, because it speaks about collision risk on a segment while an
out-of-range value is a file keepalived will not accept.

**Rule.** `keepalived_virtual_router_id` must be explicit and unique per
environment whenever more than one Kolla installation can share an L2
domain.

**Failure mode.** Deploying the second environment. The default is 51 in
every Kolla install. Two environments in one VLAN run two VRRP groups
with the same VRID and fight for master: the VIP flaps between
environments, one environment's HAProxy receives the other's traffic.
Diagnosis is miserable — both environments' logs look normal, and tcpdump
shows VRRP advertisements from hosts in neither inventory. The most
common real-world trigger is a side-by-side redeploy next to a live
environment.

**What the tool checks.** Key absent → warning. On import a missing key is
a diagnostic, not an edit (the KV-12a contract). Generating from scratch
emits the key explicitly with a comment.

**What it cannot check.** The same value in two environments' files —
that needs a second file, and the register says so rather than pretending
the single-file warning covers it.

**Not a bug when.** Environments in fully separated L2 domains with no
trunk between them and no side-by-side migration plans.

## KV-09 — VIP colliding with a host address or outside the API subnet

**Class:** B. **Mode:** combined.
**Codes:** `KV-09-VIP-COLLISION` — error (provable); `KV-09-VIP-SUBNET` —
warning (heuristic; the finding states the assumed mask).

**Rule.** `kolla_internal_vip_address` must be a free address in the same
subnet as the hosts' `api_interface` addresses, outside DHCP pools and
any other allocation.

**Failure mode.** Deploy passes — keepalived raises the address without
asking. Then: duplicate IP, ARP flapping, random API timeouts visible
only from parts of the network. With the VIP in a different subnet,
HAProxy binds and keepalived raises it, but return routing fails outside
the local segment — "works from the control node, not from a
workstation".

**What the tool checks.** The internal and external VIP against every
`ansible_host`. VIP in the host set is exact and an error. Whether the
VIP sits outside the right subnet is an inference, because inventories
carry addresses but no masks: a shared first three octets is treated as a
/24, a shared first two as a /16, anything less consistent produces no
finding rather than a guess. The rule's original text said *error* for
both; that predates the severity law and is superseded (amendment
2026-08-10).

**What it cannot check.** Whether the VIP sits inside an IaC-managed
allocation pool. Class C component; the finding reminds rather than
pretends.

**Not a bug when.** The VIP is fronted by an external load balancer —
`enable_keepalived: "no"` or `enable_haproxy: "no"`.

## KV-10 — neutron_external_interface equals the management interface or its base device

**Class:** A (generator). **Mode:** single.
**Codes:** `KV-10-EXTERNAL-DIRECT` — error; `KV-10-EXTERNAL-SHARED` —
warning.

**Rule.** `neutron_external_interface` must not be the same interface as
`network_interface` or `api_interface`, nor the base device of the VLAN
subinterface that carries management.

**Failure mode.** Mid-deploy, at `neutron : Bootstrap`. Kolla plugs the
interface into `br-ex` and strips its addressing — SSH to the host is
lost mid-run and Ansible hangs on the next task. Subtler variant:
`network_interface: bond0.10`, `neutron_external_interface: bond0`. The
VLAN subinterface theoretically survives its parent joining OVS, but the
behaviour depends on initialisation order at boot: deploy works, host
does not come back after a reboot.

**What the tool checks.** Direct equality with `network_interface`,
`api_interface` or the Ceph interface named in the form → error. Base-device match
(`network_interface` split on the first dot equals
`neutron_external_interface`) → warning demanding a written decision.

**Not a bug when.** Management on a separate NIC and the bond wholly given
to OVS — base prefixes differ. Same prefix is never a false positive, only
a decision that must be written down.

## KV-11 — [network] empty or identical to [control] under OVN

**Class:** A (validator, as a warning — whether the design intends
dedicated network nodes is unknowable statically). **Mode:** single.
**Codes:** `COLLOCATION-NETWORK` — warning; `GATEWAY-NO-HA` — warning.

**Rule.** Under OVN, `[network]` hosts get `enable-chassis-as-gw` and
become gateway chassis. If the architecture calls for dedicated network
nodes, the group must be explicit and disjoint from `[control]`.

**Failure mode.** At scale. The default `[network:children] = control`
sends all north-south traffic — SNAT, non-DVR floating IPs — through the
controllers. A three-instance lab never shows it. At around fifty
instances ovn-controller competes for CPU with MariaDB and RabbitMQ; on
gateway failover BFD flaps, and takes Corosync with it (see KV-05).

**What the tool checks.** `[network]` missing or inheriting from control
→ warning explaining the trade-off. Fewer than two network hosts while
`[compute]` has two or more → no gateway HA. A non-empty intersection
with `[control]` → dataplane on the control plane. The finding mentions
`neutron_ovn_distributed_fip: "yes"`, which softens the floating-IP part
(SNAT still goes through the gateway chassis).

**Not a bug when.** Deliberate collocation with compute —
`[network:children] = compute` is a valid pattern. The alarm is about
inheriting from control.

## KV-12a — om_enable_rabbitmq_stream_fanout left at the release default

**Class:** A (generator), release-aware. **Mode:** single.
**Codes:** `KEY-RELEASE-DEFAULT` — warning when the key is absent for a
release that flags it; `KEY-SET-EXPLICITLY` — info when the file carries
it.

**Rule.** For releases ≥ 2025.1 the default is true: all stream leaders
land on a single broker, which becomes the bottleneck.

**Failure mode.** After days. Rising RPC latency, Cinder timeouts,
benchmark runs failing on random scenarios, nova-compute missing
heartbeats. It looks like a network or Ceph problem; it is a queue
problem.

**What the tool checks.** Key absent while `openstack_release` maps to a
release whose matrix entry flags the key. Severity was lowered from
error to warning (amendment 2026-08-10): an absent key equals the
upstream default, functional and risky only at scale, and error-level
noise on every hand-written lab file teaches operators to ignore the
validator.

**The generator contract.** Generating a file from scratch, the generator
emits `om_enable_rabbitmq_stream_fanout` explicitly with a comment, so its
own output never trips its own rule. On the import path it must not
inject keys the user's file does not contain: byte-exact round-trip is
the stronger guarantee — "I will not damage your file" beats "I will
complete your file" — and a missing release-critical key surfaces as a
diagnostic, not an edit. Rule of thumb: "create me a file" may add keys;
"fix my file" may not. The generator side of this contract is pinned by
tests, not by a finding code.

**And the upstream defaults table does not widen it** (ADR-005, #81).
`defaults.js` gives the diff view a second baseline: what kolla-ansible
has in its own `group_vars` at a named tag. It is a **display**, read by
nothing that decides what the emitted file contains. A key the generator
does not emit gets no entry — the table's own guard asserts both
directions of that — so knowing an upstream default has never been, and
here is not, a reason to write a key into somebody's file.

## KV-12b — Toggling om_enable_rabbitmq_quorum_queues between deployments

**Class:** C. **Mode:** none.
**Codes:** class C: not statically checkable. The upgrade path mode lists
the switch as an operational step (`UPGRADE-PROCEDURE`) from matrix data;
that is guidance, not detection.

**Rule.** Do not change the queue type on an existing deployment without
the operational procedure.

**Failure mode.** Services try to redeclare an existing queue with a
different `x-queue-type` → `PRECONDITION_FAILED - inequivalent arg` →
restart loops, cascade. Deploy "passes", containers are Up, nothing
works.

**Why it is not checked.** Detection needs the previously deployed
revision — git history, not file contents. A fresh clone cannot answer
it, and neither can a browser (SCOPE.md, "Toggling
om_enable_rabbitmq_quorum_queues between deployments").

**Not a bug when.** First deploy on a clean environment, or a planned
destroy.

## KV-13 — Octavia amphora on a VLAN provider network without its dependency set

**Class:** A for the core (internal consistency of `globals.yml`); the
per-host interface check is B/C. **Mode:** single.
**Codes:** `KV-13-AMP-PROVIDER-OFF` — error; `KV-13-AMP-PHYSNET` — error;
`KV-13-AMP-FLAT` — info.

**Rule.** `octavia_amp_network` of type vlan requires, at once,
`enable_neutron_provider_networks: "yes"`, the named
`provider_physical_network` actually mapped in
`neutron_external_interface`/`neutron_bridge_name`, and
`octavia_network_interface` present on every host in
`[octavia-health-manager]`.

**Failure mode.** Deploy passes, load balancer create passes. The amphora
boots, goes ACTIVE in Nova — and the load balancer hangs in
PENDING_CREATE, dying to ERROR after about 25 minutes: the health manager
never receives its UDP 5555 heartbeats. If the interface is missing on
just one of three control nodes, it works at random, depending on which
health manager got the heartbeat. Amphora failover then fails the same
way.

**What the tool checks.** `provider_network_type: vlan` with provider
networks off; a physnet that does not follow from the external interface
list (physnets are positional: the n-th interface is `physnetN`); a
single-entry external interface cannot map two physnets. The generated file
carries the whole `octavia_amp_network` mapping, with a comment citing
`ansible/roles/octavia/defaults/main.yml` at 22.1.0 for the fields the form
does not ask about — Ansible replaces dictionaries rather than merging them,
so a partial map would delete the network name and the subnet.

**Amendment 2026-09-08.** From v0.1 to v0.4.1 the generator wrote two flat keys,
`octavia_amp_network_type` and `octavia_amp_network_provider_physical_network`,
neither of which occurs anywhere in the kolla-ansible tree. Kolla read neither,
built the management network from the role default — a tenant network named
`lb-mgmt-net` — and the amphora came up on the wrong network: exactly the failure
described above, produced by a file this rule had passed. The importer had read
the mapping correctly the whole time, so export and import disagreed and the
import half was right.

**What it cannot check.** Per-host interface naming in `host_vars`
(SCOPE.md, "Per-host heterogeneity in host_vars").

**Not a bug when.** An OVN-provider-only deployment with no amphora —
`octavia_provider_drivers` without amphora. Caveat:
`octavia_auto_configure: yes` still tries to create amphora resources
even then.

## KV-14 — Internal TLS without the CA in containers; overlapping FQDNs and VIPs

**Class:** A (generator). **Mode:** single.
**Codes:** `KV-14-TLS-CA`, `KV-14-FQDN-IDENTICAL`, `KV-14-FQDN-EMPTY`,
`KV-14-VIP-SHARED` — all error.

**Rule.** `kolla_enable_tls_internal: "yes"` with a private CA requires
`kolla_copy_ca_into_containers: "yes"`; `kolla_internal_fqdn` and
`kolla_external_fqdn` must differ and be covered by the certificate's
SANs; two VIP addresses cannot be one address on two interfaces.

**Failure mode (CA).** At Keystone bootstrap or the first
service-to-service call: containers do not trust the internal CA →
`SSLError: certificate verify failed` in every log at once. It looks like
a Keystone outage; it is a trust-store outage.

**Failure mode (FQDN).** Much later. Equal FQDNs make internal and public
endpoints in the service catalog point at the same thing:
service-to-service traffic leaves through the external VIP, and admin
endpoints become reachable from the public network. Usually found by an
audit, not an outage.

**What the tool checks.** Internal TLS on, copy-CA off, not Let's Encrypt
→ error. External FQDN equal to internal, or both empty while the two
VIPs differ → error. External VIP equal to internal while the two VIP
interfaces differ — HAProxy would bind the same address twice → error.

**Not a bug when.** `enable_letsencrypt: "yes"` — the system trust
store in the images suffices.

## KV-15 — openstack_release, base distro and image tag against the installed kolla-ansible

**Class:** A for the matrix part; C for the installed-version part.
**Mode:** single (generator: release × distro; validator: release
recognised).
**Codes:** `DISTRO-UNSUPPORTED`, `DISTRO-NOT-IN-RELEASE`,
`DISTRO-NO-IMAGES`, `RELEASE-REQUIRED`, `RELEASE-CHARSET`,
`RELEASE-MASTER`, `RELEASE-LEGACY-NAME`, `RELEASE-UNUSUAL-FORM`,
`RELEASE-NOT-IN-MATRIX`, `RELEASE-STATUS`, `RELEASE-HOST-OS`,
`RELEASE` (validator). Severities as the matrix carries them.

**Rule.** `openstack_release` must match the installed kolla-ansible major
version, and `kolla_base_distro`/`kolla_base_tag` must be supported in
that release.

**Failure mode.** During an upgrade, sometimes months after someone pinned
a tag "to make it work". 20.x playbooks render Epoxy templates over
images containing Dalmatian code; `db sync` runs migrations against a
schema the code does not expect — the database lands in an intermediate
state and rollback means restore from backup. Lighter variant: a new
globals flag is silently ignored because the old template does not know
it.

**What the tool checks.** Release ↔ distro support from the matrix
(18.x = 2024.1 Caracal, 19.x = 2024.2 Dalmatian, 20.x = 2025.1 Epoxy,
21.x = 2025.2 Flamingo, 22.x = 2026.1 Gazpacho, and the matrix is the
authority beyond this list); a distro the release publishes no images
for; release status (development, unmaintained, end of life) with its
date; a release the matrix does not know. The same table feeds the
generator's distro × release choice — one dataset, two consumers.

**What it cannot check.** The installed kolla-ansible version — `pip show
kolla-ansible` or the repository the operator deployed from (SCOPE.md,
"The openstack_release value against the installed kolla-ansible
version"). Class C.

**Not a bug when.** A deliberate pin to a specific internal-registry build
during a freeze window — with a ticket number and an unpin date next to
it. Without those, treat it as debt.

## Notes outside the numbered rules

**Ceph groups.** Kolla-Ansible has not deployed Ceph since Ussuri (2020).
`[ceph-mon]`-style groups indicate an inventory copied from a pre-2020
template and are reported as a stale-inventory finding
(`CEPH-OUTSIDE-KOLLA`, `QUORUM-CEPH`), not as a quorum rule. This was once
an acceptance criterion of the quorum issue and never a KV rule.

**Coupled rules.** KV-05, KV-06 and KV-11 are symptoms of one decision:
management, storage and migration sharing a link while `[network]` is not
separated. If you fix one thing before going multinode, separate the
storage and migration VLANs from `api_interface` — it also removes the
false-fencing risk that feeds KV-01.

**Where the irreplaceable value sits.** KV-01, KV-07 and KV-09 need both
files at once. The single-file tools cannot implement them; the combined
mode is not a convenience, it is where these three live (ADR-001).

## Scoreboard

| Class | Rules | Count |
|---|---|---|
| A — implemented, single file | KV-02, 03, 04, 05, 06, 08, 10, 11, 12a, 13 (core), 14, 15 (matrix) | 12 |
| B — implemented, combined mode | KV-01, 07, 09; KV-04 escalation | 3 (+1) |
| C — documented, not checkable | KV-12b, 15 (installed version); fragments of 01, 06, 07, 09, 13 | 2 (+fragments) |

## Amendments

Amendments are folded into the sections above and dated there. The
severity law was written three times — KV-04, KV-06, KV-12a — before it
was named at the top of this document; KV-09's own text contradicted it
and was corrected on 2026-08-10. Where a rule's letter contradicts the
principle, the principle wins and the letter gets amended.
