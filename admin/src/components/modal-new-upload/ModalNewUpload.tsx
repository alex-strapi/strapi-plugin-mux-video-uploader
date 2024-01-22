import { createUpload, UpChunk } from '@mux/upchunk';
import { ModalHeader, ModalLayout, Radio, RadioGroup } from '@strapi/design-system';
import { Box } from '@strapi/design-system/Box';
import { Button } from '@strapi/design-system/Button';
import { ModalBody, ModalFooter } from '@strapi/design-system/ModalLayout';
import { TextInput } from '@strapi/design-system/TextInput';
import { ToggleInput } from '@strapi/design-system/ToggleInput';
import { Typography } from '@strapi/design-system/Typography';
import Plus from '@strapi/icons/Plus';
import { FormikErrors, FormikHelpers, useFormik } from 'formik';
import React, { PropsWithChildren } from 'react';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { SUPPORTED_MUX_LANGUAGES } from '../../../../types/shared-types';
import { submitUpload, UploadInfo } from '../../services/strapi';
import getTrad from '../../utils/getTrad';
import { FileInput } from '../file-input';
import { AutogeneratedLanguageChoice } from './AutogeneratedLanguageChoice';
import CustomTextTrackForm from './CustomTextTrackForm';
import { generateUploadInfo, NEW_UPLOAD_INITIAL_VALUES, NewUploadFormValues } from './newUpload';
import UploadError from './upload-error';
import Uploaded from './uploaded';
import Uploading from './uploading';

// Hide the close button - that should be done via the "Cancel" or "Finish" buttons
const HeaderWrapper = styled.div`
  button {
    display: none;
  }
`;

const ModalNewUpload = ({ isOpen, onToggle = () => {} }: { isOpen: boolean; onToggle: (refresh: boolean) => void }) => {
  const [uploadPercent, setUploadPercent] = React.useState<number>();
  const [isComplete, setIsComplete] = React.useState<boolean>(false);
  const [uploadError, setUploadError] = React.useState<string>();

  const uploadRef = React.useRef<UpChunk | undefined>();

  const { formatMessage } = useIntl();

  const uploadFile = (endpoint: string, file: File) => {
    setUploadPercent(0);

    uploadRef.current = createUpload({ endpoint, file });
    uploadRef.current.on('error', (err) => setUploadError(err.detail));
    uploadRef.current.on('progress', (progressEvt) => {
      if (isComplete) return;
      setUploadPercent(Math.floor(progressEvt.detail));
    });
    uploadRef.current.on('success', () => {
      setIsComplete(true);
      setUploadPercent(undefined);
    });
  };

  const handleOnSubmit = async (
    body: NewUploadFormValues,
    { resetForm, setErrors }: FormikHelpers<NewUploadFormValues>
  ) => {
    let uploadInfo: UploadInfo;
    try {
      uploadInfo = generateUploadInfo({ body, formatMessage });
    } catch (errors) {
      setErrors(errors as FormikErrors<NewUploadFormValues>);

      return;
    }

    let result;
    try {
      result = await submitUpload(uploadInfo);
    } catch (err) {
      switch (typeof err) {
        case 'string': {
          setUploadError(err);
          break;
        }
        case 'object': {
          setUploadError((err as Error).message);
          break;
        }
        default: {
          setUploadError(
            formatMessage({
              id: getTrad('ModalNewUpload.unknown-error'),
              defaultMessage: 'Unknown error encountered',
            })
          );

          break;
        }
      }

      return;
    }

    const { statusCode, data } = result;

    if (statusCode && statusCode !== 200) {
      return data?.errors;
    } else if (values.upload_type === 'file') {
      uploadFile(result.url, uploadInfo.media[0] as File);
    } else if (values.upload_type === 'url') {
      setUploadPercent(100);
      setIsComplete(true);
    } else {
      console.log(
        formatMessage({
          id: getTrad('ModalNewUpload.unresolvable-upload-state'),
          defaultMessage: 'Unable to resolve upload state',
        })
      );
    }

    resetForm();
  };

  const handleOnModalClose = (forceRefresh: boolean = false) => {
    onToggle(forceRefresh);
    handleOnReset();
  };

  const handleOnAbort = () => {
    uploadRef.current?.abort();
    handleOnModalClose();
  };

  const handleOnModalFinish = () => handleOnModalClose(true);

  const renderFooter = () => {
    if (uploadError || isComplete) {
      return (
        <ModalFooter
          endActions={
            <>
              <Button variant="secondary" startIcon={<Plus />} onClick={handleOnReset}>
                {formatMessage({
                  id: getTrad('Uploaded.upload-another-button'),
                  defaultMessage: 'Upload another asset',
                })}
              </Button>
              <Button onClick={handleOnModalFinish}>
                {formatMessage({
                  id: getTrad('Common.finish-button'),
                  defaultMessage: 'Finish',
                })}
              </Button>
            </>
          }
        />
      );
    }

    if (uploadPercent !== undefined) {
      return (
        <ModalFooter
          startActions={
            <Button onClick={handleOnAbort} variant="tertiary">
              {formatMessage({
                id: getTrad('Common.cancel-button'),
                defaultMessage: 'Cancel',
              })}
            </Button>
          }
        />
      );
    }

    return (
      <ModalFooter
        startActions={
          <Button onClick={handleOnModalClose} variant="tertiary">
            {formatMessage({
              id: getTrad('Common.cancel-button'),
              defaultMessage: 'Cancel',
            })}
          </Button>
        }
        endActions={
          <Button type="submit">
            {formatMessage({
              id: getTrad('Common.save-button'),
              defaultMessage: 'Save',
            })}
          </Button>
        }
      />
    );
  };

  const { values, errors, resetForm, setFieldValue, handleChange, handleSubmit } = useFormik({
    initialValues: NEW_UPLOAD_INITIAL_VALUES,
    enableReinitialize: true,
    validateOnChange: false,
    onSubmit: handleOnSubmit,
  });

  const handleOnReset = () => {
    setUploadPercent(undefined);
    setIsComplete(false);
    setUploadError(undefined);
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <ModalLayout isOpen={isOpen}>
      <HeaderWrapper>
        <ModalHeader>
          <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
            {formatMessage({
              id: getTrad('ModalNewUpload.header'),
              defaultMessage: 'New upload',
            })}
          </Typography>
        </ModalHeader>
      </HeaderWrapper>
      <form onSubmit={handleSubmit}>
        <ModalBody>
          <FormBody
            errors={errors}
            values={values}
            setFieldValue={setFieldValue}
            handleChange={handleChange}
            isComplete={isComplete}
            uploadError={uploadError}
            uploadPercent={uploadPercent}
          />
        </ModalBody>
        {renderFooter()}
      </form>
    </ModalLayout>
  );
};

export default ModalNewUpload;

function FormBody(props: {
  errors: FormikErrors<NewUploadFormValues>;
  values: NewUploadFormValues;
  setFieldValue: <Field extends keyof NewUploadFormValues>(
    field: Field,
    value: NewUploadFormValues[Field],
    shouldValidate?: boolean | undefined
  ) => void;
  handleChange: (e: React.ChangeEvent<any>) => void;
  uploadError?: string;
  isComplete: boolean;
  uploadPercent?: number;
}) {
  const { errors, values, setFieldValue, handleChange } = props;
  const { formatMessage } = useIntl();

  if (props.uploadError) {
    return <UploadError message={props.uploadError} />;
  }

  if (props.isComplete) {
    return <Uploaded />;
  }

  if (props.uploadPercent !== undefined) {
    return <Uploading percent={props.uploadPercent} />;
  }

  return (
    <Box padding={1} background="neutral0">
      <FieldWrapper>
        <TextInput
          label={formatMessage({
            id: getTrad('Common.title-label'),
            defaultMessage: 'Title',
          })}
          name="title"
          value={values.title}
          error={errors.title}
          required
          onChange={handleChange}
        />
      </FieldWrapper>
      <FieldWrapper>
        <Typography id="upload_type_label" variant="pi" fontWeight="bold">
          {formatMessage({
            id: getTrad('Common.upload_type_label-label'),
            defaultMessage: 'Upload via',
          })}
        </Typography>
        <RadioGroup
          labelledBy="upload_type_label"
          onChange={(e: any) => setFieldValue('upload_type', e.target.value)}
          value={values.upload_type}
          name="upload_type"
          style={{
            marginTop: '0.5rem',
          }}
        >
          <Radio value="file">File</Radio>
          <Radio value="url">URL</Radio>
        </RadioGroup>
      </FieldWrapper>

      {values.upload_type === 'file' && (
        <FieldWrapper>
          <FileInput
            name="file"
            label={formatMessage({
              id: getTrad('Common.file-label'),
              defaultMessage: 'File',
            })}
            error={errors.file}
            required
            onFiles={(files: File[]) => setFieldValue('file', files)}
          />
        </FieldWrapper>
      )}

      {values.upload_type === 'url' && (
        <FieldWrapper>
          <TextInput
            label={formatMessage({
              id: getTrad('Common.url-label'),
              defaultMessage: 'Url',
            })}
            name="url"
            value={values.url}
            error={'url' in errors ? errors.url : undefined}
            required
            onChange={handleChange}
          />
        </FieldWrapper>
      )}

      <FieldWrapper>
        <ToggleInput
          label={formatMessage({
            id: getTrad('Common.signed-label'),
            defaultMessage: 'Signed Playback URL',
          })}
          name="Private"
          value={values.signed}
          onLabel="on"
          offLabel="off"
          checked={values.signed}
          onChange={(e: any) => {
            setFieldValue('signed', e.target.checked);
          }}
        />
      </FieldWrapper>

      <FieldWrapper>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
            alignItems: 'flex-start',
          }}
        >
          <div style={{ position: 'sticky', top: '1em' }}>
            <ToggleInput
              label={formatMessage({
                id: getTrad('Common.encoding_tier-label'),
                defaultMessage: 'Smart encoding',
              })}
              name="encoding_tier"
              value={values.encoding_tier}
              onLabel="on"
              offLabel="off"
              checked={values.encoding_tier === 'smart'}
              onChange={(e: any) => {
                setFieldValue(
                  'encoding_tier',
                  (e.target.checked ? 'smart' : 'baseline') as typeof values.encoding_tier
                );
              }}
            />
          </div>
          {values.encoding_tier === 'smart' && (
            <div style={{ position: 'sticky', top: '1em', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <ToggleInput
                  label={formatMessage({
                    id: getTrad('Common.mp4_support-label'),
                    defaultMessage: 'Allow downloading via MP4',
                  })}
                  name="mp4_support"
                  value={values.mp4_support}
                  onLabel="on"
                  offLabel="off"
                  checked={values.mp4_support === 'standard'}
                  onChange={(e: any) => {
                    setFieldValue('mp4_support', (e.target.checked ? 'standard' : 'none') as typeof values.mp4_support);
                  }}
                />
              </div>
              <div>
                <Typography id="max_resolution_tier_label" variant="pi" fontWeight="bold">
                  {formatMessage({
                    id: getTrad('Common.max_resolution_tier-label'),
                    defaultMessage: 'Maximum stream resolution',
                  })}
                </Typography>
                <RadioGroup
                  labelledBy="max_resolution_tier_label"
                  onChange={(e: any) => setFieldValue('max_resolution_tier', e.target.value)}
                  value={values.max_resolution_tier}
                  name="max_resolution_tier"
                  style={{
                    marginTop: '0.5rem',
                  }}
                >
                  <Radio value="2160p">2160p (4k)</Radio>
                  <Radio value="1440p">1440p (2k)</Radio>
                  <Radio value="1080p">1080p</Radio>
                </RadioGroup>
              </div>
            </div>
          )}
        </div>
      </FieldWrapper>

      <FieldWrapper>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
            alignItems: 'flex-start',
          }}
        >
          <div style={{ position: 'sticky', top: '1em' }}>
            <Typography id="text_tracks_type_label" variant="pi" fontWeight="bold">
              {formatMessage({
                id: getTrad('Common.text_tracks_type_label-label'),
                defaultMessage: 'Captions',
              })}
            </Typography>
            <RadioGroup
              labelledBy="text_tracks_type_label"
              onChange={(e: any) => setFieldValue('text_tracks_type', e.target.value)}
              value={values.text_tracks_type}
              name="text_tracks_type"
              style={{
                marginTop: '0.5rem',
              }}
            >
              <Radio value="none">None</Radio>
              <Radio value="autogenerated">Auto-generated</Radio>
              <Radio value="uploaded">Custom</Radio>
            </RadioGroup>
          </div>

          {values.text_tracks_type === 'autogenerated' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5em', position: 'sticky', top: '1em' }}>
              {SUPPORTED_MUX_LANGUAGES.map((language) => (
                <AutogeneratedLanguageChoice language={language} values={values} setFieldValue={setFieldValue} />
              ))}
            </div>
          )}

          {values.text_tracks_type === 'uploaded' && (
            <div style={{ position: 'sticky', top: '1em' }}>
              <CustomTextTrackForm
                custom_text_tracks={values.custom_text_tracks || []}
                modifyCustomTextTracks={(tracks) => setFieldValue('custom_text_tracks', tracks as any)}
              />
            </div>
          )}
        </div>
      </FieldWrapper>
    </Box>
  );
}

function FieldWrapper(props: PropsWithChildren) {
  return (
    <Box paddingTop={4} paddingBottom={4}>
      {props.children}
    </Box>
  );
}
