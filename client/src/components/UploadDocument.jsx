import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

const UploadDocument = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [department, setDepartment] = useState('');
    const [location, setLocation] = useState('');
    const [coordinates, setCoordinates] = useState(null);
    const [loading, setLoading] = useState(false);
    const [map, setMap] = useState(null);

    const handleLocationSelect = (e) => {
        const map = e.target;
        const lat = map.getCenter().lat();
        const lng = map.getCenter().lng();
        setCoordinates({ latitude: lat, longitude: lng });

        // Get address from coordinates using reverse geocoding
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results[0]) {
                setLocation(results[0].formatted_address);
            }
        });
    };

    const handleCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setCoordinates({ latitude, longitude });

                    // Update map center
                    if (map) {
                        map.setCenter({ lat: latitude, lng: longitude });
                    }

                    // Get address from coordinates
                    const geocoder = new google.maps.Geocoder();
                    geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
                        if (status === 'OK' && results[0]) {
                            setLocation(results[0].formatted_address);
                        }
                    });
                },
                (error) => {
                    toast.error('Error getting current location: ' + error.message);
                }
            );
        } else {
            toast.error('Geolocation is not supported by your browser');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file || !department || !location || !coordinates) {
            toast.error('Please fill in all fields and select a location on the map');
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('document', file);
        formData.append('department', department);
        formData.append('location', location);
        formData.append('coordinates', JSON.stringify(coordinates));

        try {
            const response = await axios.post('/api/grievances/upload-document', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            toast.success('Document uploaded successfully');
            navigate('/petitioner/dashboard');
        } catch (error) {
            console.error('Error uploading document:', error);
            toast.error(error.response?.data?.error || 'Failed to upload document');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h2 className="text-2xl font-bold mb-6">Upload Document</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Department</label>
                    <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        required
                    >
                        <option value="">Select Department</option>
                        <option value="Water">Water</option>
                        <option value="RTO">RTO</option>
                        <option value="Electricity">Electricity</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Document</label>
                    <input
                        type="file"
                        onChange={(e) => setFile(e.target.files[0])}
                        className="mt-1 block w-full"
                        accept=".pdf,.jpg,.jpeg,.png"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <div className="flex space-x-4 mb-4">
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Enter location"
                            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            required
                        />
                        <button
                            type="button"
                            onClick={handleCurrentLocation}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Use Current Location
                        </button>
                    </div>
                    <div className="h-96 w-full rounded-lg overflow-hidden">
                        <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
                            <GoogleMap
                                mapContainerStyle={{ width: '100%', height: '100%' }}
                                center={{ lat: 13.0827, lng: 80.2707 }} // Default to Chennai
                                zoom={13}
                                onClick={handleLocationSelect}
                                onLoad={map => setMap(map)}
                            >
                                {coordinates && (
                                    <Marker
                                        position={{
                                            lat: coordinates.latitude,
                                            lng: coordinates.longitude
                                        }}
                                    />
                                )}
                            </GoogleMap>
                        </LoadScript>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    {loading ? 'Uploading...' : 'Upload Document'}
                </button>
            </form>
        </div>
    );
};

export default UploadDocument; 