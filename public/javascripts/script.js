// side bar

function openNav() {
    const menuIcon = document.getElementById("menu-icon-wrap");
    document.getElementById("mySidenav").style.width = "245px";
    document.getElementById("close-btn").style.display="block";
    document.getElementById('open-btn').style.display="none";
    menuIcon.removeEventListener('click', openNav)
    menuIcon.addEventListener("click", closeNav);
}

function closeNav() {
    const menuIcon = document.getElementById("menu-icon-wrap");
    document.getElementById("mySidenav").style.width = "0";
    document.getElementById("close-btn").style.display = "none";
    document.getElementById('open-btn').style.display = "block";
    menuIcon.removeEventListener('click', closeNav)
    menuIcon.addEventListener("click", openNav);

}