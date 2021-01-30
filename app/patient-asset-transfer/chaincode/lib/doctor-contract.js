/**
 * @author Varsha Kamath
 * @email varsha.kamath@stud.fra-uas.de
 * @create date 2021-01-14 21:50:38
 * @modify date 2021-01-26 13:30:00
 * @desc [Smartcontract to read, update patient details in legder]
 */
/*
 * SPDX-License-Identifier: Apache-2.0
 */
'use strict';

let Patient = require('./Patient.js');
const AdminContract = require('./admin-contract.js');

class DoctorContract extends AdminContract {

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
            bloodGroup: asset.bloodGroup,
            allergies: asset.allergies,
            symptoms: asset.symptoms,
            diagnosis: asset.diagnosis,
            treatment: asset.treatment,
            followUp: asset.followUp
        });
        return asset;
    }

    //This function is to update patient medical details. This function should be called by only doctor.
    async updatePatientMedicalDetails(ctx, args) {
        args = JSON.parse(args);
        let patientId = args.patientId;
        let newSymptoms = args.newSymptoms;
        let newDiagnosis = args.newDiagnosis;
        let newTreatment = args.newTreatment;
        let newFollowUp = args.newFollowUp;

        const patient = await this.readPatient(ctx, patientId)
        if (newSymptoms !== null && newSymptoms !== '')
            patient.symptoms = newSymptoms;

        if (newDiagnosis !== null && newDiagnosis !== '')
            patient.diagnosis = newDiagnosis;

        if (newTreatment !== null && newTreatment !== '')
            patient.treatment = newTreatment;

        if (newFollowUp !== null && newFollowUp !== '')
            patient.followUp = newFollowUp;

        const buffer = Buffer.from(JSON.stringify(patient));
        await ctx.stub.putState(patientId, buffer);
    }

    //Read patients based on lastname
    async queryPatientsByLastName(ctx, lastName) {
        return await super.queryPatientsByLastName(ctx, lastName);
    }

    //Read patients based on firstName
    async queryPatientsByFirstName(ctx, firstName) {
        return await super.queryPatientsByFirstName(ctx, firstName);
    }

    //Retrieves patient medical history based on patientId
    async getPatientHistory(ctx, patientId) {
        let resultsIterator = await ctx.stub.getHistoryForKey(patientId);
        let asset = await this.getAllPatientResults(resultsIterator, true);

        return this.fetchLimitedFields(asset, true);
    }

    //Retrieves all patients details
    async queryAllPatients(ctx) {
        return await super.queryAllPatients(ctx);
    }

    fetchLimitedFields = (asset, includeTimeStamp = false) => {
        for (let i = 0; i < asset.length; i++) {
            const obj = asset[i];
            asset[i] = {
                patientId: obj.Key,
                firstName: obj.Record.firstName,
                lastName: obj.Record.lastName,
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
}
module.exports = DoctorContract;