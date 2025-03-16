import React, { createContext, useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export const GeneralContext = createContext(); // ✅ Move this to the top

export const useAuth = () => {
  return useContext(GeneralContext);
};

const GeneralContextProvider = ({ children }) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [usertype, setUsertype] = useState("");
  const [ticketBookingDate, setTicketBookingDate] = useState();

  const navigate = useNavigate();

  const login = async () => {
    try {
      const loginInputs = { email, password };
      const res = await axios.post("http://localhost:6001/login", loginInputs);

      localStorage.setItem("userId", res.data._id);
      localStorage.setItem("userType", res.data.usertype);
      localStorage.setItem("username", res.data.username);
      localStorage.setItem("email", res.data.email);

      if (res.data.usertype === "customer") {
        navigate("/");
      } else if (res.data.usertype === "admin") {
        navigate("/admin");
      } else if (res.data.usertype === "flight-operator") {
        navigate("/flight-admin");
      }
    } catch (err) {
      alert("Login failed!!");
      console.log(err);
    }
  };

  const register = async () => {
    try {
      const inputs = { username, email, usertype, password };
      const res = await axios.post("http://localhost:6001/register", inputs);

      localStorage.setItem("userId", res.data._id);
      localStorage.setItem("userType", res.data.usertype);
      localStorage.setItem("username", res.data.username);
      localStorage.setItem("email", res.data.email);

      if (res.data.usertype === "customer") {
        navigate("/");
      } else if (res.data.usertype === "admin") {
        navigate("/admin");
      } else if (res.data.usertype === "flight-operator") {
        navigate("/flight-admin");
      }
    } catch (err) {
      alert("Registration failed!!");
      console.log(err);
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <GeneralContext.Provider
      value={{
        login,
        register,
        logout,
        username,
        setUsername,
        email,
        setEmail,
        password,
        setPassword,
        usertype,
        setUsertype,
        ticketBookingDate,
        setTicketBookingDate,
      }}
    >
      {children}
    </GeneralContext.Provider>
  );
};

export default GeneralContextProvider;
