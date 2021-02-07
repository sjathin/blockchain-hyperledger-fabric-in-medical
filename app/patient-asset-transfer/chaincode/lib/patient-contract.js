/**
 * @author Varsha Kamath
 * @email varsha.kamath@stud.fra-uas.de
 * @create date 2020-12-14 21:50:38
 * @modify date 2021-02-05 20:15:21
 * @desc [Patient Smartcontract to read, update and delete patient details in legder]
 */
/*
 * SPDX-License-Identifier: Apache-2.0
 */
'use strict';

let Patient = require('./Patient.js');
const crypto = require('crypto');
const PrimaryContract = require('./primary-contract.js');
const { Context } = require('fabric-contract-api');

class PatientContract extends PrimaryContract {

    //Read patient details based on patientId
    async readPatient(ctx, patientId) {
        const exists = await this.patientExists(ctx, patientId);
        if (!exists) {
            throw new Error(`The patient ${patientId} does not exist`);
        }

        const buffer = await ctx.stub.getState(patientId);
        let asset = JSON.parse(buffer.toString());
        asset = ({
            patientId: patientId,
            firstName: asset.firstName,
            lastName: asset.lastName,
            age: asset.age,
            phoneNumber: asset.phoneNumber,
            emergPhoneNumber: asset.emergPhoneNumber,
            address: asset.address,
            bloodGroup: asset.bloodGroup,
            allergies: asset.allergies,
            symptoms: asset.symptoms,
            diagnosis: asset.diagnosis,
            treatment: asset.treatment,
            followUp: asset.followUp,
            permissionGranted: asset.permissionGranted,
            password: asset.password,
            pwdTemp: asset.pwdTemp
        });
        return asset;
    }

    //Delete patient from the ledger based on patientId
    async deletePatient(ctx, patientId) {
        const exists = await this.patientExists(ctx, patientId);
        if (!exists) {
            throw new Error(`The patient ${patientId} does not exist`);
        }
        await ctx.stub.deleteState(patientId);
    }

    //This function is to update patient personal details. This function should be called by patient.
    async updatePatientPersonalDetails(ctx, args) {
        args = JSON.parse(args);
        let patientId = args.patientId;
        let newPhoneNumber = args.newPhoneNumber;
        let newEmergPhoneNumber = args.newEmergPhoneNumber;
        let newAddress = args.newAddress;
        let newAllergies = args.newAllergies;

        const patient = await this.readPatient(ctx, patientId)
        if (newPhoneNumber !== null && newPhoneNumber !== '')
            patient.phoneNumber = newPhoneNumber;

        if (newEmergPhoneNumber !== null && newEmergPhoneNumber !== '')
            patient.emergPhoneNumber = newEmergPhoneNumber;

        if (newAddress !== null && newAddress !== '')
            patient.address = newAddress;

        if (newAllergies !== null && newAllergies !== '')
            patient.allergies = newAllergies;

        const buffer = Buffer.from(JSON.stringify(patient));
        await ctx.stub.putState(patientId, buffer);
    }

    //This function is to update patient password. This function should be called by patient.
    async updatePatientPassword(ctx, args) {
        args = JSON.parse(args);
        let patientId = args.patientId;
        let newPassword = args.newPassword;

        if (newPassword === null || newPassword === '') {
            throw new Error(`Empty or null values should not be passed for newPassword parameter`);
        }

        const patient = await this.readPatient(ctx, patientId);
        patient.password = crypto.createHash('sha256').update(newPassword).digest('hex');
        if(patient.pwdTemp){
            patient.pwdTemp = false;
        }
        const buffer = Buffer.from(JSON.stringify(patient));
        await ctx.stub.putState(patientId, buffer);
    }

    //Returns the patient's password
    async getPatientPassword(ctx, patientId) {
        let patient = await this.readPatient(ctx, patientId);
        patient = ({
            password: patient.password,
            pwdTemp: patient.pwdTemp})
        return patient;
    }

    //Retrieves patient medical history based on patientId
    async getPatientHistory(ctx, patientId) {
        let resultsIterator = await ctx.stub.getHistoryForKey(patientId);
        let asset = await this.getAllPatientResults(resultsIterator, true);

        return this.fetchLimitedFields(asset, true);
    }

    fetchLimitedFields = (asset, includeTimeStamp = false) => {
        for (let i = 0; i < asset.length; i++) {
            const obj = asset[i];
            asset[i] = {
                patientId: obj.Key,
                firstName: obj.Record.firstName,
                lastName: obj.Record.lastName,
                age: obj.Record.age,
                address: obj.Record.address,
                phoneNumber: obj.Record.phoneNumber,
                emergPhoneNumber: obj.Record.emergPhoneNumber,
                bloodGroup: obj.Record.bloodGroup,
                allergies: obj.Record.allergies,
                symptoms: obj.Record.symptoms,
                diagnosis: obj.Record.diagnosis,
                treatment: obj.Record.treatment,
                followUp: obj.Record.followUp
            };
            if (includeTimeStamp) {
                asset[i].Timestamp = obj.Timestamp;
            }
        }

        return asset;
    };
    /**
     * @author Jathin Sreenivas
     * @param  {Context} ctx
     * @param  {JSON} args containing patientId and doctorId
     * @description Add the doctor to the permissionGranted array
     */
    async grantAccessToDoctor(ctx, args) {
        args = JSON.parse(args);
        let patientId = args.patientId;
        let doctorId = args.doctorId;

        // Get the patient asset from world state
        const patient = await this.readPatient(ctx, patientId);
        // unique doctorIDs in permissionGranted 
        if (!patient.permissionGranted.includes(doctorId)) {
            patient.permissionGranted.push(doctorId);
        }
        const buffer = Buffer.from(JSON.stringify(patient));
        // Update the ledger with updated permissionGranted
        await ctx.stub.putState(patientId, buffer);
    };

    /**
     * @author Jathin Sreenivas
     * @param  {Context} ctx
     * @param  {JSON} args containing patientId and doctorId
     * @description Remove the doctor from the permissionGranted array
     */
    async revokeAccessFromDoctor(ctx, args) {
        args = JSON.parse(args);
        let patientId = args.patientId;
        let doctorId = args.doctorId;

        // Get the patient asset from world state
        const patient = await this.readPatient(ctx, patientId);
        // Remove the doctor if existing
        if (patient.permissionGranted.includes(doctorId)) {
            patient.permissionGranted = patient.permissionGranted.filter(doctor => doctor !== doctorId);
        }
        const buffer = Buffer.from(JSON.stringify(patient));
        // Update the ledger with updated permissionGranted
        await ctx.stub.putState(patientId, buffer);
    };
}
module.exports = PatientContract;