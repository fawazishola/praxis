// ============================================================
// FLUX STANDARD LIBRARY: CGROUP V2
// ============================================================
// System interface for Linux cgroup v2 resource control
//
// This library provides Flux functions to:
// - Create and manage cgroups
// - Set CPU weights and memory limits
// - Assign processes to cgroups
// - Monitor resource usage
//
// Author: Fawaz Ishola
// Date: January 2026
// ============================================================

// ------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------

var CGROUP_ROOT = "/sys/fs/cgroup";
var TENET_ROOT = "/sys/fs/cgroup/tenet";

// CPU weight range (cgroup v2)
var CPU_WEIGHT_MIN = 1;
var CPU_WEIGHT_MAX = 10000;
var CPU_WEIGHT_DEFAULT = 100;

// Memory constants
var MB = 1048576;  // 1 MB in bytes
var GB = 1073741824;  // 1 GB in bytes

// ------------------------------------------------------------
// CGROUP CREATION
// ------------------------------------------------------------

// Create the tenet parent cgroup
fun cgroup_init():
    system("mkdir -p " + TENET_ROOT);

    // Enable cpu and memory controllers
    var controllers = CGROUP_ROOT + "/cgroup.subtree_control";
    system("echo '+cpu +memory' > " + controllers + " 2>/dev/null");

    print "Tenet cgroup initialized at " + TENET_ROOT;
    return 1;

// Create a cgroup for a specific task
fun cgroup_create(task_name):
    var path = TENET_ROOT + "/" + task_name;
    system("mkdir -p " + path);
    print "Created cgroup: " + path;
    return path;

// Remove a task cgroup
fun cgroup_remove(task_name):
    var path = TENET_ROOT + "/" + task_name;

    // First move any processes out
    var procs_file = path + "/cgroup.procs";
    system("cat " + procs_file + " | while read pid; do echo $pid > " + CGROUP_ROOT + "/cgroup.procs; done 2>/dev/null");

    // Then remove the directory
    system("rmdir " + path + " 2>/dev/null");
    print "Removed cgroup: " + path;
    return 1;

// Cleanup all tenet cgroups
fun cgroup_cleanup():
    system("for dir in " + TENET_ROOT + "/*/; do rmdir \"$dir\" 2>/dev/null; done");
    system("rmdir " + TENET_ROOT + " 2>/dev/null");
    print "Cleaned up tenet cgroups";
    return 1;

// ------------------------------------------------------------
// CPU CONTROL
// ------------------------------------------------------------

// Set CPU weight for a task (1-10000, 100 = normal)
fun cgroup_set_cpu_weight(task_name, weight):
    var path = TENET_ROOT + "/" + task_name;

    // Clamp weight to valid range
    if weight < CPU_WEIGHT_MIN:
        weight = CPU_WEIGHT_MIN;
    if weight > CPU_WEIGHT_MAX:
        weight = CPU_WEIGHT_MAX;

    system("echo " + weight + " > " + path + "/cpu.weight");
    print "Set CPU weight for " + task_name + " = " + weight;
    return weight;

// Get current CPU weight
fun cgroup_get_cpu_weight(task_name):
    var path = TENET_ROOT + "/" + task_name + "/cpu.weight";
    var result = system("cat " + path + " 2>/dev/null");
    return result;

// Set CPU quota (microseconds per period)
// Example: 50000/100000 = 50% of one CPU
fun cgroup_set_cpu_quota(task_name, quota_us, period_us):
    var path = TENET_ROOT + "/" + task_name;
    system("echo '" + quota_us + " " + period_us + "' > " + path + "/cpu.max");
    print "Set CPU quota for " + task_name + " = " + quota_us + "/" + period_us;
    return 1;

// ------------------------------------------------------------
// MEMORY CONTROL
// ------------------------------------------------------------

// Set memory limit in bytes
fun cgroup_set_memory_bytes(task_name, limit_bytes):
    var path = TENET_ROOT + "/" + task_name;
    system("echo " + limit_bytes + " > " + path + "/memory.max");
    print "Set memory limit for " + task_name + " = " + limit_bytes + " bytes";
    return limit_bytes;

// Set memory limit in megabytes (convenience)
fun cgroup_set_memory_mb(task_name, limit_mb):
    var limit_bytes = limit_mb * MB;
    return cgroup_set_memory_bytes(task_name, limit_bytes);

// Set memory limit in gigabytes (convenience)
fun cgroup_set_memory_gb(task_name, limit_gb):
    var limit_bytes = limit_gb * GB;
    return cgroup_set_memory_bytes(task_name, limit_bytes);

// Get current memory usage
fun cgroup_get_memory_usage(task_name):
    var path = TENET_ROOT + "/" + task_name + "/memory.current";
    var result = system("cat " + path + " 2>/dev/null");
    return result;

// ------------------------------------------------------------
// PROCESS MANAGEMENT
// ------------------------------------------------------------

// Assign a process to a cgroup
fun cgroup_assign(pid, task_name):
    var path = TENET_ROOT + "/" + task_name + "/cgroup.procs";
    system("echo " + pid + " > " + path);
    print "Assigned PID " + pid + " to cgroup " + task_name;
    return 1;

// Get list of processes in a cgroup
fun cgroup_list_procs(task_name):
    var path = TENET_ROOT + "/" + task_name + "/cgroup.procs";
    var result = system("cat " + path + " 2>/dev/null");
    return result;

// Get current process PID
fun getpid():
    var result = system("echo $$");
    return result;

// ------------------------------------------------------------
// MONITORING
// ------------------------------------------------------------

// Get CPU statistics for a cgroup
fun cgroup_cpu_stats(task_name):
    var path = TENET_ROOT + "/" + task_name + "/cpu.stat";
    var result = system("cat " + path + " 2>/dev/null");
    return result;

// Get memory statistics for a cgroup
fun cgroup_memory_stats(task_name):
    var path = TENET_ROOT + "/" + task_name + "/memory.stat";
    var result = system("cat " + path + " 2>/dev/null");
    return result;

// Check if cgroup exists
fun cgroup_exists(task_name):
    var path = TENET_ROOT + "/" + task_name;
    var result = system("test -d " + path + " && echo 1 || echo 0");
    return result;

// ------------------------------------------------------------
// HIGH-LEVEL ALLOCATION
// ------------------------------------------------------------

// Create cgroup with full resource allocation
// This is the main function used by the scheduler
fun cgroup_allocate(task_name, cpu_weight, mem_mb):
    // Create the cgroup
    cgroup_create(task_name);

    // Set CPU weight
    cgroup_set_cpu_weight(task_name, cpu_weight);

    // Set memory limit
    cgroup_set_memory_mb(task_name, mem_mb);

    print "Allocated resources for " + task_name + ": cpu_weight=" + cpu_weight + ", mem=" + mem_mb + "MB";
    return 1;

// Apply a complete allocation map
// allocations is expected to be a list of [name, cpu_weight, mem_mb] arrays
fun cgroup_apply_allocation(allocations):
    // Initialize parent cgroup
    cgroup_init();

    var i = 0;
    while i < len(allocations):
        var alloc = allocations[i];
        var name = alloc[0];
        var cpu_weight = alloc[1];
        var mem_mb = alloc[2];

        cgroup_allocate(name, cpu_weight, mem_mb);
        i = i + 1;

    print "Applied " + len(allocations) + " allocations";
    return 1;

// ------------------------------------------------------------
// UTILITY FUNCTIONS
// ------------------------------------------------------------

// Convert priority score to CPU weight
// priority_score: 0-1000 economic priority
// Returns: 1-10000 cgroup cpu.weight
fun priority_to_weight(priority_score, total_priority, num_tasks):
    var share = priority_score / total_priority;
    var weight = 100 * share * num_tasks;

    // Clamp to valid range
    if weight < CPU_WEIGHT_MIN:
        weight = CPU_WEIGHT_MIN;
    if weight > CPU_WEIGHT_MAX:
        weight = CPU_WEIGHT_MAX;

    return weight;

// Calculate priority score from utility and moat
fun calc_priority(utility, moat):
    return utility * moat;

// Print cgroup status
fun cgroup_status(task_name):
    print "=== Cgroup Status: " + task_name + " ===";
    print "CPU weight: " + cgroup_get_cpu_weight(task_name);
    print "Memory usage: " + cgroup_get_memory_usage(task_name);
    print "Processes: " + cgroup_list_procs(task_name);
    return 1;
