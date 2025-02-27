class ApiResponse{
    constructor(statusCode,data,message="success"){
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.success = statusCode<400; //true if status code is less than 400
    }
}

export {ApiResponse};