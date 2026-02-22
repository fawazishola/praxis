// Flux Standard Library: Package Manager Module
// Build and install system packages

// Check if package is installed
pkg_is_installed(name) = {
    result = system("which " + name + " >/dev/null 2>&1")
    result == 0
}

// Install package using apt (Debian/Ubuntu)
pkg_apt_install(name) = {
    cmd = "apt install -y " + name
    system(cmd)
}

// Configure package from source
pkg_configure(source_dir, prefix, flags) = {
    chdir(source_dir)
    cmd = "./configure --prefix=" + prefix + " " + flags
    system(cmd)
}

// Build package
pkg_make(cores) = {
    cmd = "make -j" + cores + ""
    system(cmd)
}

// Install built package
pkg_install() = {
    system("make install")
}

// Run ldconfig after installing libraries
pkg_ldconfig() = {
    system("ldconfig")
}

// Complete build workflow
pkg_build_from_source(source_dir, cores) = {
    chdir(source_dir)
    pkg_configure(source_dir, "/usr", "-O3 -march=native")
    pkg_make(cores)
    pkg_install()
    pkg_ldconfig()
}
