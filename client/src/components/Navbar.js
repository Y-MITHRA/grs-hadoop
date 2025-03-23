import React, { useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  ListItemIcon,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  const handleMobileMenuOpen = (event) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = async () => {
    await logout();
    handleUserMenuClose();
    navigate('/login');
  };

  const handleNavigation = (path) => {
    navigate(path);
    handleMobileMenuClose();
    handleUserMenuClose();
  };

  return (
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'background.paper' }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ minHeight: 64 }}>
          {/* Logo */}
          <WaterDropIcon
            sx={{
              display: { xs: 'none', md: 'flex' },
              mr: 1,
              color: 'primary.main',
            }}
          />
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              flexGrow: 1,
              textDecoration: 'none',
              color: 'text.primary',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <WaterDropIcon
              sx={{
                display: { xs: 'flex', md: 'none' },
                mr: 1,
                color: 'primary.main',
              }}
            />
            Water Grievance Portal
          </Typography>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              {user ? (
                <>
                  <Button
                    color="inherit"
                    component={RouterLink}
                    to="/dashboard"
                    startIcon={<DashboardIcon />}
                    sx={{
                      color: 'text.primary',
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    Dashboard
                  </Button>
                  <Button
                    color="inherit"
                    component={RouterLink}
                    to="/submit-grievance"
                    startIcon={<AddCircleOutlineIcon />}
                    sx={{
                      color: 'text.primary',
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    Submit Grievance
                  </Button>
                  <IconButton
                    onClick={handleUserMenuOpen}
                    sx={{ ml: 2 }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: 'primary.main',
                        width: 32,
                        height: 32,
                      }}
                    >
                      {user.name[0].toUpperCase()}
                    </Avatar>
                  </IconButton>
                </>
              ) : (
                <>
                  <Button
                    color="inherit"
                    component={RouterLink}
                    to="/login"
                    sx={{
                      color: 'text.primary',
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    Login
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    component={RouterLink}
                    to="/register"
                  >
                    Register
                  </Button>
                </>
              )}
            </Box>
          )}

          {/* Mobile Menu Button */}
          {isMobile && (
            <IconButton
              edge="end"
              color="inherit"
              onClick={handleMobileMenuOpen}
              sx={{ color: 'text.primary' }}
            >
              <MenuIcon />
            </IconButton>
          )}
        </Toolbar>
      </Container>

      {/* Mobile Menu */}
      <Menu
        anchorEl={mobileMenuAnchor}
        open={Boolean(mobileMenuAnchor)}
        onClose={handleMobileMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            mt: 1.5,
            width: 200,
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
          },
        }}
      >
        {user ? (
          <>
            <MenuItem onClick={() => handleNavigation('/dashboard')}>
              <ListItemIcon>
                <DashboardIcon fontSize="small" />
              </ListItemIcon>
              Dashboard
            </MenuItem>
            <MenuItem onClick={() => handleNavigation('/submit-grievance')}>
              <ListItemIcon>
                <AddCircleOutlineIcon fontSize="small" />
              </ListItemIcon>
              Submit Grievance
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </>
        ) : (
          <>
            <MenuItem onClick={() => handleNavigation('/login')}>
              Login
            </MenuItem>
            <MenuItem onClick={() => handleNavigation('/register')}>
              Register
            </MenuItem>
          </>
        )}
      </Menu>

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            mt: 1.5,
            minWidth: 180,
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
          },
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle1" noWrap>
            {user?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {user?.email}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => handleNavigation('/dashboard')}>
          <ListItemIcon>
            <DashboardIcon fontSize="small" />
          </ListItemIcon>
          Dashboard
        </MenuItem>
        <MenuItem onClick={() => handleNavigation('/submit-grievance')}>
          <ListItemIcon>
            <AddCircleOutlineIcon fontSize="small" />
          </ListItemIcon>
          Submit Grievance
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </AppBar>
  );
};

export default Navbar; 