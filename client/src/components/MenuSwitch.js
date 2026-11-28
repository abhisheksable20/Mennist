// On/off row in the navbar: a card in the phone menu (menu), a label + switch on desktop
function MenuSwitch({ menu, id, icon, title, subtitle, shortTitle, checked, onChange, disabled }) {
    return (
        <div className={menu ? "navbar-chat-menu-card" : "d-flex align-items-center gap-2"}>

            {menu && <span className="navbar-menu-icon navbar-chat-icon">{icon}</span>}

            <div className={menu ? "navbar-chat-copy" : ""}>
                {menu ? (
                    <>
                        <strong className="navbar-chat-mobile-title">{title}</strong>
                        <small className="navbar-chat-subtitle">{subtitle}</small>
                        <strong className="navbar-chat-desktop-title">{shortTitle}</strong>
                    </>
                ) : (
                    <h5 className="mb-0 post-title mx-2">{shortTitle}</h5>
                )}
            </div>

            <div className="large-switch form-check form-switch mb-0">
                <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id={id}
                    aria-label={title}
                    checked={checked}
                    onChange={onChange}
                    disabled={disabled}
                />
            </div>

        </div>
    )
}

export default MenuSwitch
