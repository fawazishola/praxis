// Flux Scheduler Library

// task_create(name, cpu_percent, mem_bytes)
// cpu_percent: 50 = 50% core, 200 = 2 cores
// mem_bytes: limit in bytes
task_create = fun(name, cpu_percent, mem_bytes) {
    var res = cgroup_create(name);
    if (res != 0) {
        print("Warning: cgroup_create failed for " + name);
    }
    
    // CPU: percent * 1000 (100% = 100000 quota)
    // Input 50 -> 50000
    var quota = cpu_percent * 1000;
    cgroup_set_cpu(name, quota);
    
    cgroup_set_memory(name, mem_bytes);
    
    print("Created environment " + name);
    return res;
};

task_run = fun(name, command) {
    print("Running task in " + name + ": " + command);
    var start = clock();
    
    var exit_code = cgroup_exec(name, command);
    
    var duration = clock() - start;
    // print("Duration: " + duration + "s");
    
    return exit_code;
};

task_cleanup = fun(name) {
    cgroup_delete(name);
};

