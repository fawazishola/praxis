// Flux Standard Library: System Module
// Provides system orchestration capabilities

// Execute system command
// Returns exit code (0 = success)
sys_run(cmd) = system(cmd)

// Get environment variable
sys_getenv(var_name) = getenv(var_name)

// Change directory
sys_cd(path) = chdir(path)

// Get current directory
sys_pwd() = getcwd()

// File system operations using shell commands
sys_ls(path) = {
    system("ls -la " + path)
}

sys_mkdir(path) = {
    system("mkdir -p " + path)
}

sys_rm(path) = {
    system("rm -rf " + path)
}

// Download files
sys_download(url, output) = {
    cmd = "wget --no-check-certificate " + url + " -O " + output
    system(cmd)
}
