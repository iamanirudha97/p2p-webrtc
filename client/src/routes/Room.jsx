import React from 'react'
import { io } from 'socket.io-client';
import { useEffect, useReducer, useRef, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom/cjs/react-router-dom.min';

const Room = () => {
    const socket = useMemo(
        () =>
          io("http://localhost:3000", {
            withCredentials: true,
          }),
        []
      );

    const { roomId } = useParams()
    console.log("Room id is", roomId)
    const localVideoRef = useRef()
    const remoteVideoRef = useRef()
    const pc = useRef(new RTCPeerConnection(null))

    useEffect(() => {
        socket.on("connection-success", success => {
            console.log(success)
        })

        socket.emit("join room", roomId)

        socket.on("offer", data => {
            pc.current.setRemoteDescription(new RTCSessionDescription(data))
            .then(() => console.log("Offer Remote description set successfully"))
            .catch(err => console.error("Error setting remote description:", err));
        })

        socket.on("answer", data => {
            pc.current.setRemoteDescription(new RTCSessionDescription(data))
            .then(() => console.log("Answer Remote description set successfully"))
            .catch(err => console.error("Error setting remote description:", err));
        })

        socket.on("candidate", data => {
            pc.current.addIceCandidate(new RTCIceCandidate(data))
            .then(() => console.log("added ice candidate"))
            .catch(err => console.error("Error setting ice candidate:", err));
        })

        const _pc = new RTCPeerConnection({video:true, audio: false })     
        
        _pc.onicecandidate = (e) => {
            if(e.candidate){
                socket.emit("candidate", e.candidate)
                console.log("on ice candidate",e)
            }
        }

        _pc.oniceconnectionstatechange = (e) => {
            console.log("state changed ",e)
        }
      

        _pc.ontrack = (e) => {
            remoteVideoRef.current.srcObject = e.streams[0]
        }

        pc.current = _pc
    },[])

    const shareScreen = () => {
        const displayMediaOptions = {
            video: {
                cursor: "always"
            },
            audio: false
        };
        navigator.mediaDevices.getDisplayMedia(displayMediaOptions)
        .then( stream => {
            localVideoRef.current.srcObject = stream
            stream.getTracks().forEach( track => {
                pc.current.addTrack(track, stream)
            })
        })
    }

    const createOffer = () => {
        pc.current.createOffer().then(offer => {
            pc.current.setLocalDescription(offer)
            socket.emit("offer", offer)
        }).catch(err => console.log("error in creating offer", err))
    }

    const createAnswer = () => {
        pc.current.createAnswer().then(sdp => {
            pc.current.setLocalDescription(sdp)
            socket.emit("answer", sdp)
            console.log("we need to send this answer to other peer", sdp)
        }).catch(err => console.log("error in creating offer", err))
    }


  return (
    <div style={{ margin: 10 }}>
    <video ref={localVideoRef} autoPlay 
    style={{
      width: 240, height: 240, margin: 10, background:'black'
    }} > </video>
    
    <video ref={remoteVideoRef} autoPlay 
    style={{
      width: 240, height: 240, margin: 10,  background:'black'
    }} > </video>

    <button onClick={createOffer}> Offer </button>
    <button onClick={createAnswer}> Answer </button>
    <button onClick={shareScreen}> share </button>
</div>
  )
}

export default Room