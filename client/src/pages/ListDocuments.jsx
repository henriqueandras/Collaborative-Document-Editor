import { Button } from "@mui/base";
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { SocketClient } from "../SocketClientContext";


export default function ListDocuments(){
    const [list, setList] = useState([]);
    const navigate = useNavigate();
    const socket = useContext(SocketClient);

    const fetchData = async () => {
        try {
          const response = await fetch('http://localhost:3001/getDocumentList', {
            method: 'GET'
            });
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          const data = await response.json();
          console.log(response);
          console.log(data);
          setList(data.documents);
        } catch (error) {
          console.error('Error:', error);
        }
      }

    useEffect(()=>{
        fetchData();
    },[]);

    return (
        <div>
            {
                list?.map((li, i)=>{
                    return(
                        <div key={i}>
                            <Button onClick={()=>{
                                socket.emit("join-document",{
                                    documentId:li
                                });
                                navigate(`/document?id=${li}`);
                            }}>{li}</Button>
                        </div>
                    )
                })
            }
        </div>
    )
}